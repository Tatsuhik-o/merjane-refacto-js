import {type Cradle} from '@fastify/awilix';
import {eq} from 'drizzle-orm';
import {type INotificationService} from '../notifications.port.js';
import {products, type Product} from '@/db/schema.js';
import {type Database} from '@/db/type.js';

export class ProductService {
	private readonly ns: INotificationService;
	private readonly db: Database;

	public constructor({ns, db}: Pick<Cradle, 'ns' | 'db'>) {
		this.ns = ns;
		this.db = db;
	}

	// Again updating function outside to remove redundency

	private async updateProduct(p: Product): Promise<void>{
		await this.db.update(products).set(p).where(eq(products.id, p.id))
	}

	// same thing to notify when product is out of stock

	private async sendOutOfStockNotification(p: Product, expired: boolean): Promise<void> {
		this.ns.sendOutOfStockNotification(p.name);
		// if expired reset count to 0
		if(expired){
			p.available = 0
		}
		await this.updateProduct(p);
	}

	public async notifyDelay(leadTime: number, p: Product): Promise<void> {
		p.leadTime = leadTime;
		await this.updateProduct(p)
		this.ns.sendDelayNotification(leadTime, p.name);
	}

	public async handleSeasonalProduct(p: Product): Promise<void> {
		const currentDate = new Date();
		const productEndDate = new Date(currentDate.getTime() + (p.leadTime * 1000 * 60 * 60 * 24));
		if (productEndDate > p.seasonEndDate!) {
			await this.sendOutOfStockNotification(p, true)
		} else if (p.seasonStartDate! > currentDate) {
			await this.sendOutOfStockNotification(p, false)
		} else {
			await this.notifyDelay(p.leadTime, p);
		}
	}

	public async handleExpiredProduct(p: Product): Promise<void> {
		const currentDate = new Date();
		if (p.expiryDate! > currentDate) {
			p.available = Math.max(p.available - 1, 0); // same thing, this will always default to a positive number
			await this.updateProduct(p)
		} else {
			await this.sendOutOfStockNotification(p, true)
		}
	}
}
