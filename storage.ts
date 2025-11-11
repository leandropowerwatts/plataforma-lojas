import {
  users,
  stores,
  categories,
  products,
  productVariants,
  orders,
  orderItems,
  coupons,
  reviews,
  plans,
  subscriptions,
  shippingConfigs,
  shippingZones,
  type User,
  type UpsertUser,
  type Store,
  type InsertStore,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type ProductVariant,
  type InsertProductVariant,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type Coupon,
  type InsertCoupon,
  type Review,
  type InsertReview,
  type Plan,
  type InsertPlan,
  type Subscription,
  type InsertSubscription,
  type ShippingConfig,
  type InsertShippingConfig,
  type ShippingZone,
  type InsertShippingZone,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Store operations
  getStoreByUserId(userId: string): Promise<Store | undefined>;
  getAllStoresByUserId(userId: string): Promise<Store[]>;
  getStoreById(id: string): Promise<Store | undefined>;
  getStoreBySlug(slug: string): Promise<Store | undefined>;
  createStore(store: InsertStore & { userId: string }): Promise<Store>;
  updateStore(id: string, store: Partial<InsertStore>): Promise<Store>;
  duplicateStore(storeId: string, newName: string, newSlug: string): Promise<Store>;
  deleteStore(id: string): Promise<void>;

  // Category operations
  getCategoriesByStoreId(storeId: string): Promise<Category[]>;
  createCategory(category: InsertCategory & { storeId: string }): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Product operations
  getProductsByStoreId(storeId: string): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct & { storeId: string }): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Order operations
  getOrdersByStoreId(storeId: string): Promise<Order[]>;
  createOrder(order: InsertOrder & { storeId: string }): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order>;

  // Order item operations
  createOrderItem(item: InsertOrderItem & { orderId: string }): Promise<OrderItem>;
  getOrderItemsByOrderId(orderId: string): Promise<OrderItem[]>;

  // Coupon operations
  getCouponsByStoreId(storeId: string): Promise<Coupon[]>;
  getCouponByCode(storeId: string, code: string): Promise<Coupon | undefined>;
  createCoupon(coupon: InsertCoupon & { storeId: string }): Promise<Coupon>;
  updateCoupon(id: string, coupon: Partial<InsertCoupon>): Promise<Coupon>;
  deleteCoupon(id: string): Promise<void>;

  // Review operations
  getReviewsByStoreId(storeId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Plan operations
  getAllPlans(): Promise<Plan[]>;
  getPlanById(id: string): Promise<Plan | undefined>;
  getPlanBySlug(slug: string): Promise<Plan | undefined>;

  // Subscription operations
  getSubscriptionByUserId(userId: string): Promise<(Subscription & { plan: Plan }) | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription>;
  cancelSubscription(userId: string): Promise<void>;

  // Shipping operations
  getShippingConfig(storeId: string): Promise<ShippingConfig | undefined>;
  upsertShippingConfig(config: InsertShippingConfig & { storeId: string }): Promise<ShippingConfig>;
  getShippingZones(storeId: string): Promise<ShippingZone[]>;
  createShippingZone(zone: InsertShippingZone & { storeId: string }): Promise<ShippingZone>;
  updateShippingZone(id: string, zone: Partial<InsertShippingZone>): Promise<ShippingZone>;
  deleteShippingZone(id: string): Promise<void>;
  calculateShipping(storeId: string, zipCode: string, orderTotal: number): Promise<{ cost: number; estimatedDays: number }>;

  // Dashboard stats
  getDashboardStats(storeId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (!userData.email) {
      // Insert new user without email lookup
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }

    // Try to find user by email (since email is unique)
    const existingUsers = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
    const existing = existingUsers[0];
    
    if (existing) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return user;
    } else {
      // Insert new user
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }
  }

  // Store operations
  async getStoreByUserId(userId: string): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.userId, userId));
    return store;
  }

  async getAllStoresByUserId(userId: string): Promise<Store[]> {
    return db.select().from(stores).where(eq(stores.userId, userId)).orderBy(desc(stores.createdAt));
  }

  async getStoreById(id: string): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async getStoreBySlug(slug: string): Promise<Store | undefined> {
    // Case-insensitive slug lookup for better UX
    const [store] = await db.select().from(stores).where(sql`lower(${stores.slug}) = lower(${slug})`);
    return store;
  }

  async createStore(storeData: InsertStore & { userId: string }): Promise<Store> {
    const [store] = await db.insert(stores).values(storeData).returning();
    return store;
  }

  async updateStore(id: string, storeData: Partial<InsertStore>): Promise<Store> {
    const [store] = await db
      .update(stores)
      .set({ ...storeData, updatedAt: new Date() })
      .where(eq(stores.id, id))
      .returning();
    return store;
  }

  async duplicateStore(storeId: string, newName: string, newSlug: string): Promise<Store> {
    return await db.transaction(async (tx) => {
      const originalStore = await this.getStoreById(storeId);
      if (!originalStore) {
        throw new Error("Loja original não encontrada");
      }

      const [newStore] = await tx.insert(stores).values({
        userId: originalStore.userId,
        name: newName,
        slug: newSlug,
        description: originalStore.description,
        logo: originalStore.logo,
        banner: originalStore.banner,
        primaryColor: originalStore.primaryColor,
        secondaryColor: originalStore.secondaryColor,
        whatsappNumber: originalStore.whatsappNumber,
        isActive: true,
      }).returning();

      const originalCategories = await this.getCategoriesByStoreId(storeId);
      const categoryMapping: { [oldId: string]: string } = {};

      for (const category of originalCategories) {
        const [newCategory] = await tx.insert(categories).values({
          storeId: newStore.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
        }).returning();
        categoryMapping[category.id] = newCategory.id;
      }

      const originalProducts = await this.getProductsByStoreId(storeId);
      for (const product of originalProducts) {
        await tx.insert(products).values({
          storeId: newStore.id,
          categoryId: product.categoryId ? categoryMapping[product.categoryId] : null,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          images: product.images,
          stock: product.stock,
          isActive: product.isActive,
        });
      }

      const originalCoupons = await this.getCouponsByStoreId(storeId);
      for (const coupon of originalCoupons) {
        await tx.insert(coupons).values({
          storeId: newStore.id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          isActive: coupon.isActive,
        });
      }

      const originalShippingConfig = await this.getShippingConfig(storeId);
      if (originalShippingConfig) {
        await tx.insert(shippingConfigs).values({
          storeId: newStore.id,
          freeShippingThreshold: originalShippingConfig.freeShippingThreshold,
          defaultShippingCost: originalShippingConfig.defaultShippingCost,
        });
      }

      const originalShippingZones = await this.getShippingZones(storeId);
      for (const zone of originalShippingZones) {
        await tx.insert(shippingZones).values({
          storeId: newStore.id,
          name: zone.name,
          zipCodeStart: zone.zipCodeStart,
          zipCodeEnd: zone.zipCodeEnd,
          shippingCost: zone.shippingCost,
          estimatedDays: zone.estimatedDays,
        });
      }

      return newStore;
    });
  }

  async deleteStore(id: string): Promise<void> {
    await db.delete(stores).where(eq(stores.id, id));
  }

  // Category operations
  async getCategoriesByStoreId(storeId: string): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.storeId, storeId));
  }

  async createCategory(categoryData: InsertCategory & { storeId: string }): Promise<Category> {
    const [category] = await db.insert(categories).values(categoryData).returning();
    return category;
  }

  async updateCategory(id: string, categoryData: Partial<InsertCategory>): Promise<Category> {
    const [category] = await db
      .update(categories)
      .set(categoryData)
      .where(eq(categories.id, id))
      .returning();
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Product operations
  async getProductsByStoreId(storeId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.storeId, storeId)).orderBy(desc(products.createdAt));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(productData: InsertProduct & { storeId: string }): Promise<Product> {
    const [product] = await db.insert(products).values(productData).returning();
    return product;
  }

  async updateProduct(id: string, productData: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Order operations
  async getOrdersByStoreId(storeId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.storeId, storeId)).orderBy(desc(orders.createdAt));
  }

  async createOrder(orderData: InsertOrder & { storeId: string }): Promise<Order> {
    const [order] = await db.insert(orders).values(orderData).returning();
    return order;
  }

  async updateOrder(id: string, orderData: Partial<InsertOrder>): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({ ...orderData, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  // Order item operations
  async createOrderItem(itemData: InsertOrderItem & { orderId: string }): Promise<OrderItem> {
    const [item] = await db.insert(orderItems).values(itemData).returning();
    return item;
  }

  async getOrderItemsByOrderId(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  // Coupon operations
  async getCouponsByStoreId(storeId: string): Promise<Coupon[]> {
    return db.select().from(coupons).where(eq(coupons.storeId, storeId)).orderBy(desc(coupons.createdAt));
  }

  async getCouponByCode(storeId: string, code: string): Promise<Coupon | undefined> {
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(and(eq(coupons.storeId, storeId), eq(coupons.code, code)));
    return coupon;
  }

  async createCoupon(couponData: InsertCoupon & { storeId: string }): Promise<Coupon> {
    const [coupon] = await db.insert(coupons).values(couponData).returning();
    return coupon;
  }

  async updateCoupon(id: string, couponData: Partial<InsertCoupon>): Promise<Coupon> {
    const [coupon] = await db
      .update(coupons)
      .set(couponData)
      .where(eq(coupons.id, id))
      .returning();
    return coupon;
  }

  async deleteCoupon(id: string): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, id));
  }

  // Review operations
  async getReviewsByStoreId(storeId: string): Promise<Review[]> {
    const productIds = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.storeId, storeId));
    
    if (productIds.length === 0) return [];

    return db
      .select()
      .from(reviews)
      .where(sql`${reviews.productId} IN (${sql.join(productIds.map((p) => sql`${p.id}`), sql`, `)})`)
      .orderBy(desc(reviews.createdAt));
  }

  async createReview(reviewData: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(reviewData).returning();
    return review;
  }

  // Plan operations
  async getAllPlans(): Promise<Plan[]> {
    return db.select().from(plans).where(eq(plans.isActive, true)).orderBy(plans.price);
  }

  async getPlanById(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async getPlanBySlug(slug: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.slug, slug));
    return plan;
  }

  // Subscription operations
  async getSubscriptionByUserId(userId: string): Promise<(Subscription & { plan: Plan }) | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!subscription || !subscription.plans) return undefined;

    return {
      ...subscription.subscriptions,
      plan: subscription.plans,
    };
  }

  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db.insert(subscriptions).values(subscriptionData).returning();
    return subscription;
  }

  async updateSubscription(id: string, subscriptionData: Partial<InsertSubscription>): Promise<Subscription> {
    const [subscription] = await db
      .update(subscriptions)
      .set({ ...subscriptionData, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return subscription;
  }

  async cancelSubscription(userId: string): Promise<void> {
    await db
      .update(subscriptions)
      .set({ status: "canceled", cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId));
  }

  // Shipping operations
  async getShippingConfig(storeId: string): Promise<ShippingConfig | undefined> {
    const [config] = await db
      .select()
      .from(shippingConfigs)
      .where(eq(shippingConfigs.storeId, storeId))
      .limit(1);
    return config;
  }

  async upsertShippingConfig(configData: InsertShippingConfig & { storeId: string }): Promise<ShippingConfig> {
    const existing = await this.getShippingConfig(configData.storeId);
    
    if (existing) {
      const [updated] = await db
        .update(shippingConfigs)
        .set({ ...configData, updatedAt: new Date() })
        .where(eq(shippingConfigs.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(shippingConfigs).values(configData).returning();
      return created;
    }
  }

  async getShippingZones(storeId: string): Promise<ShippingZone[]> {
    return await db
      .select()
      .from(shippingZones)
      .where(and(eq(shippingZones.storeId, storeId), eq(shippingZones.isActive, true)))
      .orderBy(shippingZones.name);
  }

  async createShippingZone(zoneData: InsertShippingZone & { storeId: string }): Promise<ShippingZone> {
    const [zone] = await db.insert(shippingZones).values(zoneData).returning();
    return zone;
  }

  async updateShippingZone(id: string, zoneData: Partial<InsertShippingZone>): Promise<ShippingZone> {
    const [zone] = await db
      .update(shippingZones)
      .set(zoneData)
      .where(eq(shippingZones.id, id))
      .returning();
    return zone;
  }

  async deleteShippingZone(id: string): Promise<void> {
    await db.delete(shippingZones).where(eq(shippingZones.id, id));
  }

  async calculateShipping(storeId: string, zipCode: string, orderTotal: number): Promise<{ cost: number; estimatedDays: number }> {
    const config = await this.getShippingConfig(storeId);
    const cleanZip = zipCode.replace(/\D/g, ''); // Remove non-numeric characters

    // Check for free shipping threshold
    if (config?.freeShippingThreshold && parseFloat(config.freeShippingThreshold) > 0) {
      if (orderTotal >= parseFloat(config.freeShippingThreshold)) {
        return { cost: 0, estimatedDays: 7 };
      }
    }

    // Try to find matching shipping zone
    const zones = await this.getShippingZones(storeId);
    for (const zone of zones) {
      const zipStart = zone.zipCodeStart.replace(/\D/g, '');
      const zipEnd = zone.zipCodeEnd.replace(/\D/g, '');
      
      if (cleanZip >= zipStart && cleanZip <= zipEnd) {
        return {
          cost: parseFloat(zone.shippingCost),
          estimatedDays: zone.estimatedDays || 7,
        };
      }
    }

    // Fallback to default shipping cost
    const defaultCost = config?.defaultShippingCost ? parseFloat(config.defaultShippingCost) : 0;
    return { cost: defaultCost, estimatedDays: 7 };
  }

  // Dashboard stats
  async getDashboardStats(storeId: string): Promise<any> {
    const orderList = await this.getOrdersByStoreId(storeId);
    const productList = await this.getProductsByStoreId(storeId);

    const revenue = orderList
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, order) => sum + parseFloat(order.total), 0);

    const pendingOrders = orderList.filter((o) => o.status === "pending").length;
    const activeProducts = productList.filter((p) => p.isActive).length;

    return {
      revenue,
      revenueGrowth: 12,
      orders: orderList.length,
      pendingOrders,
      products: productList.length,
      activeProducts,
      conversionRate: 3.2,
      conversionGrowth: 0.5,
      recentOrders: orderList.slice(0, 5),
    };
  }
}

export const storage = new DatabaseStorage();
