import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { requireActiveSubscription, checkProductLimit, getPlanUsage } from "./subscriptionMiddleware";
import { sendOrderConfirmation } from "./notifications";
import Stripe from "stripe";
import {
  insertStoreSchema,
  insertCategorySchema,
  insertProductSchema,
  insertOrderSchema,
  insertCouponSchema,
  insertReviewSchema,
} from "@shared/schema";

// Initialize Stripe only if key is available
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-10-29.clover",
    })
  : null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Diagnostic endpoint
  app.get("/api/diagnostic", (req, res) => {
    const host = req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    const callbackURL = `${protocol}://${host}/api/callback`;
    
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      authenticated: req.isAuthenticated(),
      request: {
        hostname: req.hostname,
        protocol: req.protocol,
        host: req.get('host'),
        'x-forwarded-proto': req.get('x-forwarded-proto'),
        'x-forwarded-host': req.get('x-forwarded-host'),
        origin: req.get('origin'),
        referer: req.get('referer'),
      },
      computed: {
        callbackURL,
        loginURL: `${protocol}://${host}/api/login`,
      }
    });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Store routes
  app.get("/api/stores", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stores = await storage.getAllStoresByUserId(userId);
      
      if (stores.length === 0) {
        const user = await storage.getUser(userId);
        const defaultSlug = `loja-${userId.slice(0, 8)}`;
        const newStore = await storage.createStore({
          userId,
          name: user?.firstName ? `Loja ${user.firstName}` : "Minha Loja",
          slug: defaultSlug,
          description: "",
          isActive: true,
        });
        return res.json([newStore]);
      }
      
      res.json(stores);
    } catch (error: any) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ message: "Failed to fetch stores" });
    }
  });

  app.get("/api/store", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storeId = req.query.storeId as string | undefined;
      
      let store;
      if (storeId) {
        store = await storage.getStoreById(storeId);
        if (!store || store.userId !== userId) {
          return res.status(404).json({ message: "Store not found" });
        }
      } else {
        store = await storage.getStoreByUserId(userId);
        
        if (!store) {
          const user = await storage.getUser(userId);
          const defaultSlug = `loja-${userId.slice(0, 8)}`;
          store = await storage.createStore({
            userId,
            name: user?.firstName ? `Loja ${user.firstName}` : "Minha Loja",
            slug: defaultSlug,
            description: "",
            isActive: true,
          });
        }
      }
      
      res.json(store);
    } catch (error: any) {
      console.error("Error fetching store:", error);
      res.status(500).json({ message: "Failed to fetch store" });
    }
  });

  app.post("/api/stores", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertStoreSchema.omit({ userId: true }).parse(req.body);
      
      const store = await storage.createStore({
        ...validatedData,
        userId,
      });
      
      res.json(store);
    } catch (error: any) {
      console.error("Error creating store:", error);
      res.status(400).json({ message: error.message || "Failed to create store" });
    }
  });

  app.post("/api/stores/:id/duplicate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storeId = req.params.id;
      const { name, slug } = req.body;
      
      const originalStore = await storage.getStoreById(storeId);
      if (!originalStore || originalStore.userId !== userId) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      if (!name || !slug) {
        return res.status(400).json({ message: "Nome e slug são obrigatórios" });
      }
      
      const existingStore = await storage.getStoreBySlug(slug);
      if (existingStore) {
        return res.status(400).json({ message: "Já existe uma loja com este slug" });
      }
      
      const duplicatedStore = await storage.duplicateStore(storeId, name, slug);
      res.json(duplicatedStore);
    } catch (error: any) {
      console.error("Error duplicating store:", error);
      res.status(400).json({ message: error.message || "Failed to duplicate store" });
    }
  });

  app.delete("/api/stores/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storeId = req.params.id;
      
      const store = await storage.getStoreById(storeId);
      if (!store || store.userId !== userId) {
        return res.status(404).json({ message: "Loja não encontrada" });
      }
      
      await storage.deleteStore(storeId);
      res.json({ success: true, message: "Loja excluída com sucesso" });
    } catch (error: any) {
      console.error("Error deleting store:", error);
      res.status(500).json({ message: error.message || "Falha ao excluir loja" });
    }
  });

  app.patch("/api/store", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storeId = req.query.storeId as string | undefined;
      
      let store;
      if (storeId) {
        store = await storage.getStoreById(storeId);
        if (!store || store.userId !== userId) {
          return res.status(404).json({ message: "Store not found" });
        }
      } else {
        store = await storage.getStoreByUserId(userId);
        if (!store) {
          return res.status(404).json({ message: "Store not found" });
        }
      }

      const validatedData = insertStoreSchema.partial().parse(req.body);
      const updated = await storage.updateStore(store.id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating store:", error);
      res.status(400).json({ message: error.message || "Failed to update store" });
    }
  });

  app.get("/api/stores/:slug", async (req, res) => {
    try {
      const store = await storage.getStoreBySlug(req.params.slug);
      
      if (!store || !store.isActive) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      res.json(store);
    } catch (error: any) {
      console.error("Error fetching store:", error);
      res.status(500).json({ message: "Failed to fetch store" });
    }
  });

  app.get("/api/stores/:slug/products", async (req, res) => {
    try {
      const store = await storage.getStoreBySlug(req.params.slug);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const products = await storage.getProductsByStoreId(store.id);
      res.json(products.filter((p) => p.isActive));
    } catch (error: any) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/stores/:slug/categories", async (req, res) => {
    try {
      const store = await storage.getStoreBySlug(req.params.slug);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const categories = await storage.getCategoriesByStoreId(store.id);
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Category routes
  app.get("/api/categories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const categories = await storage.getCategoriesByStoreId(store.id);
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory({
        ...validatedData,
        storeId: store.id,
      });
      res.json(category);
    } catch (error: any) {
      console.error("Error creating category:", error);
      res.status(400).json({ message: error.message || "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(req.params.id, validatedData);
      res.json(category);
    } catch (error: any) {
      console.error("Error updating category:", error);
      res.status(400).json({ message: error.message || "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.json({ message: "Category deleted" });
    } catch (error: any) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Product routes
  app.get("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const products = await storage.getProductsByStoreId(store.id);
      res.json(products);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", isAuthenticated, requireActiveSubscription, checkProductLimit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Se storeId foi fornecido no body, verificar se pertence ao usuário
      // Caso contrário, usar a primeira loja do usuário
      let targetStoreId = req.body.storeId;
      
      if (targetStoreId) {
        // Verificar se a loja pertence ao usuário
        const targetStore = await storage.getStoreById(targetStoreId);
        if (!targetStore || targetStore.userId !== userId) {
          return res.status(403).json({ message: "You don't have permission to add products to this store" });
        }
      } else {
        // Usar a primeira loja do usuário
        const store = await storage.getStoreByUserId(userId);
        if (!store) {
          return res.status(404).json({ message: "Store not found" });
        }
        targetStoreId = store.id;
      }

      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct({
        ...validatedData,
        storeId: targetStoreId,
        isActive: true, // Ensure product is active and visible on storefront
      });
      res.json(product);
    } catch (error: any) {
      console.error("Error creating product:", error);
      res.status(400).json({ message: error.message || "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, validatedData);
      res.json(product);
    } catch (error: any) {
      console.error("Error updating product:", error);
      res.status(400).json({ message: error.message || "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted" });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Temporary fix: Activate all inactive products
  app.post("/api/products/fix-inactive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const products = await storage.getProductsByStoreId(store.id);
      let fixedCount = 0;
      
      for (const product of products) {
        if (!product.isActive) {
          await storage.updateProduct(product.id, { isActive: true });
          fixedCount++;
        }
      }
      
      res.json({ message: `${fixedCount} produtos ativados com sucesso`, count: fixedCount });
    } catch (error: any) {
      console.error("Error fixing inactive products:", error);
      res.status(500).json({ message: "Failed to fix products" });
    }
  });

  // Order routes
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const orders = await storage.getOrdersByStoreId(store.id);
      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      const { storeId, items, ...orderData } = req.body;

      const order = await storage.createOrder({
        ...validatedData,
        storeId,
      });

      // Create order items
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createOrderItem({
            orderId: order.id,
            ...item,
          });
        }
      }

      // Send notifications asynchronously (don't wait for it)
      const store = await storage.getStoreById(storeId);
      if (store) {
        sendOrderConfirmation(order, store).catch((error) => {
          console.error("Failed to send order notifications:", error);
        });
      }

      res.json(order);
    } catch (error: any) {
      console.error("Error creating order:", error);
      res.status(400).json({ message: error.message || "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertOrderSchema.partial().parse(req.body);
      const order = await storage.updateOrder(req.params.id, validatedData);
      res.json(order);
    } catch (error: any) {
      console.error("Error updating order:", error);
      res.status(400).json({ message: error.message || "Failed to update order" });
    }
  });

  // Coupon routes
  app.get("/api/coupons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const coupons = await storage.getCouponsByStoreId(store.id);
      res.json(coupons);
    } catch (error: any) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ message: "Failed to fetch coupons" });
    }
  });

  app.post("/api/coupons", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const validatedData = insertCouponSchema.parse(req.body);
      const coupon = await storage.createCoupon({
        ...validatedData,
        storeId: store.id,
      });
      res.json(coupon);
    } catch (error: any) {
      console.error("Error creating coupon:", error);
      res.status(400).json({ message: error.message || "Failed to create coupon" });
    }
  });

  app.patch("/api/coupons/:id", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCouponSchema.partial().parse(req.body);
      const coupon = await storage.updateCoupon(req.params.id, validatedData);
      res.json(coupon);
    } catch (error: any) {
      console.error("Error updating coupon:", error);
      res.status(400).json({ message: error.message || "Failed to update coupon" });
    }
  });

  app.delete("/api/coupons/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCoupon(req.params.id);
      res.json({ message: "Coupon deleted" });
    } catch (error: any) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({ message: "Failed to delete coupon" });
    }
  });

  // Shipping routes
  app.get("/api/shipping/config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const config = await storage.getShippingConfig(store.id);
      res.json(config || {});
    } catch (error: any) {
      console.error("Error fetching shipping config:", error);
      res.status(500).json({ message: "Failed to fetch shipping config" });
    }
  });

  app.post("/api/shipping/config", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const config = await storage.upsertShippingConfig({
        ...req.body,
        storeId: store.id,
      });
      
      res.json(config);
    } catch (error: any) {
      console.error("Error saving shipping config:", error);
      res.status(500).json({ message: "Failed to save shipping config" });
    }
  });

  app.get("/api/shipping/zones", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const zones = await storage.getShippingZones(store.id);
      res.json(zones);
    } catch (error: any) {
      console.error("Error fetching shipping zones:", error);
      res.status(500).json({ message: "Failed to fetch shipping zones" });
    }
  });

  app.post("/api/shipping/zones", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const zone = await storage.createShippingZone({
        ...req.body,
        storeId: store.id,
      });
      
      res.json(zone);
    } catch (error: any) {
      console.error("Error creating shipping zone:", error);
      res.status(500).json({ message: "Failed to create shipping zone" });
    }
  });

  app.patch("/api/shipping/zones/:id", isAuthenticated, async (req, res) => {
    try {
      const zone = await storage.updateShippingZone(req.params.id, req.body);
      res.json(zone);
    } catch (error: any) {
      console.error("Error updating shipping zone:", error);
      res.status(500).json({ message: "Failed to update shipping zone" });
    }
  });

  app.delete("/api/shipping/zones/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteShippingZone(req.params.id);
      res.json({ message: "Shipping zone deleted" });
    } catch (error: any) {
      console.error("Error deleting shipping zone:", error);
      res.status(500).json({ message: "Failed to delete shipping zone" });
    }
  });

  // Calculate shipping (public route for store checkout)
  app.post("/api/shipping/calculate", async (req, res) => {
    try {
      const { storeSlug, zipCode, orderTotal } = req.body;
      
      if (!storeSlug || !zipCode) {
        return res.status(400).json({ message: "Store slug and zip code are required" });
      }

      const store = await storage.getStoreBySlug(storeSlug);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const shipping = await storage.calculateShipping(store.id, zipCode, orderTotal || 0);
      
      // Return with frontend-compatible field names
      res.json({
        shippingCost: shipping.cost.toString(),
        estimatedDays: shipping.estimatedDays,
        isFree: shipping.cost === 0,
      });
    } catch (error: any) {
      console.error("Error calculating shipping:", error);
      res.status(500).json({ message: "Failed to calculate shipping" });
    }
  });

  // Review routes
  app.get("/api/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const reviews = await storage.getReviewsByStoreId(store.id);
      res.json(reviews);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const store = await storage.getStoreByUserId(userId);
      
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }

      const stats = await storage.getDashboardStats(store.id);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Plan usage stats
  app.get("/api/plan-usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const usage = await getPlanUsage(userId);
      
      if (!usage) {
        return res.status(404).json({ message: "Unable to fetch plan usage" });
      }

      res.json(usage);
    } catch (error: any) {
      console.error("Error fetching plan usage:", error);
      res.status(500).json({ message: "Failed to fetch plan usage" });
    }
  });

  // Stripe payment route for one-time payments
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment processing is not configured" });
      }

      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "brl",
        payment_method_types: ["card", "pix"], // Support both card and PIX payments
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Plan routes
  // Cache plans in memory since they rarely change
  let plansCache: any[] | null = null;
  let plansCacheTime = 0;
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  app.get("/api/plans", async (req, res) => {
    try {
      // Disable browser caching completely
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Return from cache if available and fresh
      const now = Date.now();
      if (plansCache && (now - plansCacheTime) < CACHE_TTL) {
        return res.json(plansCache);
      }

      // Try to fetch from database
      const plans = await storage.getAllPlans();
      
      // Update cache
      plansCache = plans;
      plansCacheTime = now;
      
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      
      // If we have cached plans, return them even if stale
      if (plansCache) {
        console.log("Returning stale plans from cache due to DB error");
        return res.json(plansCache);
      }
      
      // Fallback: return hardcoded plans if no cache
      console.log("Returning hardcoded plans as fallback");
      const fallbackPlans = [
        {
          id: "gratis",
          name: "Grátis",
          slug: "gratis",
          price: "0.00",
          stripePriceId: null,
          maxProducts: 5,
          maxOrders: 10,
          features: ["Até 5 produtos", "Até 10 pedidos/mês", "Loja básica", "Suporte por email"],
          isActive: true,
        },
        {
          id: "basico",
          name: "Básico",
          slug: "basico",
          price: "29.90",
          stripePriceId: null,
          maxProducts: 50,
          maxOrders: 100,
          features: ["Até 50 produtos", "Até 100 pedidos/mês", "Personalização de cores", "Cupons de desconto", "Suporte prioritário"],
          isActive: true,
        },
        {
          id: "profissional",
          name: "Profissional",
          slug: "profissional",
          price: "79.90",
          stripePriceId: null,
          maxProducts: 200,
          maxOrders: null,
          features: ["Até 200 produtos", "Pedidos ilimitados", "Personalização completa", "Cupons ilimitados", "Análises avançadas", "Suporte VIP"],
          isActive: true,
        },
        {
          id: "enterprise",
          name: "Enterprise",
          slug: "enterprise",
          price: "199.90",
          stripePriceId: null,
          maxProducts: null,
          maxOrders: null,
          features: ["Produtos ilimitados", "Pedidos ilimitados", "Todas as funcionalidades", "API personalizada", "Suporte dedicado 24/7"],
          isActive: true,
        },
      ];
      res.json(fallbackPlans);
    }
  });

  // Subscription routes
  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getSubscriptionByUserId(userId);
      
      // If no subscription, user is on free plan
      if (!subscription) {
        const freePlan = await storage.getPlanBySlug("gratis");
        return res.json({
          status: "active",
          plan: freePlan,
          isFree: true,
        });
      }
      
      res.json(subscription);
    } catch (error: any) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.post("/api/subscription/create-checkout", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment processing is not configured" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { planId } = req.body;

      if (!planId) {
        return res.status(400).json({ message: "Plan ID is required" });
      }

      const plan = await storage.getPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // For free plan, just create subscription directly
      if (parseFloat(plan.price) === 0) {
        const freeSub = await storage.createSubscription({
          userId,
          planId: plan.id,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        });
        return res.json({ success: true, subscription: freeSub });
      }

      // Create Stripe checkout session for paid plans
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: plan.name,
                description: `Plano ${plan.name} - Loja Fácil`,
              },
              unit_amount: Math.round(parseFloat(plan.price) * 100),
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.protocol}://${req.get('host')}/dashboard/subscription?success=true`,
        cancel_url: `${req.protocol}://${req.get('host')}/dashboard/subscription?canceled=true`,
        client_reference_id: userId,
        customer_email: user?.email || undefined,
        metadata: {
          userId,
          planId: plan.id,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session: " + error.message });
    }
  });

  app.post("/api/subscription/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.cancelSubscription(userId);
      res.json({ success: true, message: "Assinatura cancelada com sucesso" });
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // Stripe webhook for subscription events
  app.post("/api/webhook/stripe", async (req, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Stripe not configured" });
      }

      const event = req.body;

      // Handle the event
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const userId = session.metadata?.userId;
          const planId = session.metadata?.planId;

          if (userId && planId) {
            await storage.createSubscription({
              userId,
              planId,
              status: "active",
              stripeSubscriptionId: session.subscription,
              stripeCustomerId: session.customer,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            });
          }
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          // Update subscription status in database
          // This would need more implementation based on your needs
          break;
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  });

  // Endpoint para popular o banco com os planos (produção)
  // FORÇA a criação mesmo que já existam (para resolver problema de bancos diferentes)
  app.post("/api/admin/setup-plans", async (req, res) => {
    try {
      console.log("🔧 Setup Plans - Iniciando...");
      
      // Importar o db e plans table
      const { db } = await import("./db");
      const { plans } = await import("@shared/schema");
      const { sql } = await import("drizzle-orm");

      // Primeiro, DELETAR todos os planos existentes
      console.log("🗑️ Deletando planos antigos...");
      await db.delete(plans);
      
      console.log("✨ Criando novos planos...");
      
      // Inserir os 4 planos
      const plansToInsert = [
        { 
          name: "Grátis", 
          slug: "gratis", 
          price: "0.00", 
          maxProducts: 5, 
          maxOrders: 10, 
          features: ["Até 5 produtos", "Até 10 pedidos/mês", "Loja básica", "Suporte por email"],
          isActive: true,
          stripePriceId: null
        },
        { 
          name: "Básico", 
          slug: "basico", 
          price: "29.90", 
          maxProducts: 50, 
          maxOrders: 100, 
          features: ["Até 50 produtos", "Até 100 pedidos/mês", "Personalização de cores", "Cupons de desconto", "Suporte prioritário"],
          isActive: true,
          stripePriceId: null
        },
        { 
          name: "Profissional", 
          slug: "profissional", 
          price: "79.90", 
          maxProducts: 200, 
          maxOrders: null, 
          features: ["Até 200 produtos", "Pedidos ilimitados", "Personalização completa", "Cupons ilimitados", "Análises avançadas", "Suporte VIP"],
          isActive: true,
          stripePriceId: null
        },
        { 
          name: "Enterprise", 
          slug: "enterprise", 
          price: "199.90", 
          maxProducts: null, 
          maxOrders: null, 
          features: ["Produtos ilimitados", "Pedidos ilimitados", "Todas as funcionalidades", "API personalizada", "Suporte dedicado 24/7"],
          isActive: true,
          stripePriceId: null
        },
      ];

      const result = await db.insert(plans).values(plansToInsert).returning();
      
      console.log(`✅ ${result.length} planos criados com sucesso!`);

      res.json({ 
        success: true, 
        message: `🎉 Sucesso! ${result.length} planos foram criados no banco de dados!`,
        created: result.length,
        plans: result
      });
    } catch (error: any) {
      console.error("❌ Error creating plans:", error);
      res.status(500).json({ 
        success: false, 
        message: "Erro ao criar planos: " + error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
