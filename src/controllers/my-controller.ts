/* eslint-disable @typescript-eslint/switch-exhaustiveness-check */
/* eslint-disable max-depth */
/* eslint-disable no-await-in-loop */
import { eq } from 'drizzle-orm';
import fastifyPlugin from 'fastify-plugin';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { orders, products } from '@/db/schema.js';

export const myController = fastifyPlugin(async server => {
	// Add schema validator and serializer
	server.setValidatorCompiler(validatorCompiler);
	server.setSerializerCompiler(serializerCompiler);

	server.withTypeProvider<ZodTypeProvider>().post(
		'/orders/:orderId/processOrder',
		{
			schema: {
				params: z.object({
					orderId: z.coerce.number(),
				}),
			},
		},
		async (request, reply) => {
			const db = server.diContainer.resolve('db');
			const ps = server.diContainer.resolve('ps');

			const order = await db.query.orders.findFirst({
				where: eq(orders.id, request.params.orderId),
				with: {
					products: {
						columns: {},
						with: {
							product: true,
						},
					},
				},
			});

			if (!order) {
				return reply.status(404).send({ error: 'Order not found' });
			}

			console.log(order);

			// outsourced updating stock to a function to avoid code redundency

			const updateProductAvailability = async (p: any) => {
				p.available = Math.max(p.available - 1, 0) 
				await db.update(products).set(p).where(eq(products.id, p.id));
			};

			const { products: productList } = order;

			for (const { product: p } of productList) {
				const currentDate = new Date();

				switch (p.type) {
					case 'NORMAL':
						await updateProductAvailability(p);
						// removed destructuring to make it easier to know where the keys and values belongs to
						if (p.leadTime > 0) {
							await ps.notifyDelay(p.leadTime, p);
						}
						break;

					case 'SEASONAL':
						// I assume every seasonal product have a start date and an end date by default but just checking in case
						const inSeason =
							p.seasonStartDate && p.seasonEndDate && currentDate > p.seasonStartDate && currentDate < p.seasonEndDate;
						if (inSeason) {
							await updateProductAvailability(p);
						} else {
							await ps.handleSeasonalProduct(p);
						}
						break;

					case 'EXPIRABLE':
						// same thing for expiry date
						if (p.expiryDate && p.expiryDate > currentDate) {
							await updateProductAvailability(p);
						} else {
							await ps.handleExpiredProduct(p);
						}
						break;

					default:
						console.warn(`Unknown product type: ${p.type}`);
						break;
				}
			}

			await reply.send({ orderId: order.id });
		}
	);
});


