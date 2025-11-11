import type { RequestHandler } from "express";
import { storage } from "./storage";

interface PlanLimits {
  maxProducts: number | null;
  maxOrders: number | null;
}

// Middleware para verificar se o usuário tem uma assinatura ativa
export const requireActiveSubscription: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const subscription = await storage.getSubscriptionByUserId(userId);
    
    // Se não tem assinatura, está no plano gratuito
    if (!subscription) {
      const freePlan = await storage.getPlanBySlug("gratis");
      req.subscription = {
        status: "active",
        plan: freePlan,
        isFree: true,
      };
      return next();
    }

    // Verifica se a assinatura está ativa
    if (subscription.status !== "active") {
      return res.status(403).json({ 
        message: "Sua assinatura não está ativa. Por favor, renove sua assinatura.",
        redirectTo: "/dashboard/subscription"
      });
    }

    req.subscription = subscription;
    next();
  } catch (error) {
    console.error("Error checking subscription:", error);
    res.status(500).json({ message: "Erro ao verificar assinatura" });
  }
};

// Middleware para verificar limite de produtos
export const checkProductLimit: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    const store = await storage.getStoreByUserId(userId);
    
    if (!store) {
      return res.status(404).json({ message: "Loja não encontrada" });
    }

    const subscription = req.subscription;
    const plan = subscription?.plan;

    // Se o plano tem limite de produtos
    if (plan?.maxProducts !== null && plan?.maxProducts !== undefined) {
      const currentProducts = await storage.getProductsByStoreId(store.id);
      
      if (currentProducts.length >= plan.maxProducts) {
        return res.status(403).json({
          message: `Você atingiu o limite de ${plan.maxProducts} produtos do plano ${plan.name}. Faça upgrade para adicionar mais produtos.`,
          limit: plan.maxProducts,
          current: currentProducts.length,
          upgradeRequired: true,
          redirectTo: "/dashboard/subscription"
        });
      }
    }

    next();
  } catch (error) {
    console.error("Error checking product limit:", error);
    res.status(500).json({ message: "Erro ao verificar limite de produtos" });
  }
};

// Middleware para verificar limite de pedidos
export const checkOrderLimit: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    const store = await storage.getStoreByUserId(userId);
    
    if (!store) {
      return res.status(404).json({ message: "Loja não encontrada" });
    }

    const subscription = req.subscription;
    const plan = subscription?.plan;

    // Se o plano tem limite de pedidos
    if (plan?.maxOrders !== null && plan?.maxOrders !== undefined) {
      const currentOrders = await storage.getOrdersByStoreId(store.id);
      
      // Conta pedidos do mês atual
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const ordersThisMonth = currentOrders.filter(order => 
        new Date(order.createdAt!) >= firstDayOfMonth
      );

      if (ordersThisMonth.length >= plan.maxOrders) {
        return res.status(403).json({
          message: `Você atingiu o limite de ${plan.maxOrders} pedidos/mês do plano ${plan.name}. Faça upgrade para processar mais pedidos.`,
          limit: plan.maxOrders,
          current: ordersThisMonth.length,
          upgradeRequired: true,
          redirectTo: "/dashboard/subscription"
        });
      }
    }

    next();
  } catch (error) {
    console.error("Error checking order limit:", error);
    res.status(500).json({ message: "Erro ao verificar limite de pedidos" });
  }
};

// Helper para obter informações de uso do plano
export async function getPlanUsage(userId: string) {
  try {
    const store = await storage.getStoreByUserId(userId);
    if (!store) return null;

    const subscription = await storage.getSubscriptionByUserId(userId);
    const plan = subscription?.plan || await storage.getPlanBySlug("gratis");

    const products = await storage.getProductsByStoreId(store.id);
    const orders = await storage.getOrdersByStoreId(store.id);

    // Conta pedidos do mês atual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ordersThisMonth = orders.filter(order => 
      new Date(order.createdAt!) >= firstDayOfMonth
    );

    return {
      plan: {
        name: plan?.name,
        slug: plan?.slug,
        maxProducts: plan?.maxProducts,
        maxOrders: plan?.maxOrders,
      },
      usage: {
        products: {
          current: products.length,
          limit: plan?.maxProducts,
          percentage: plan?.maxProducts ? (products.length / plan.maxProducts) * 100 : 0,
        },
        orders: {
          current: ordersThisMonth.length,
          limit: plan?.maxOrders,
          percentage: plan?.maxOrders ? (ordersThisMonth.length / plan.maxOrders) * 100 : 0,
        },
      },
    };
  } catch (error) {
    console.error("Error getting plan usage:", error);
    return null;
  }
}
