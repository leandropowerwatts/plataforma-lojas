// From javascript_log_in_with_replit blueprint
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use MemoryStore for sessions - reliable and fast
  const MemStore = MemoryStore(session);
  const sessionStore = new MemStore({
    checkPeriod: sessionTtl,
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  const user = await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });

  // Create store if it doesn't exist
  const existingStore = await storage.getStoreByUserId(user.id);
  if (!existingStore) {
    const storeName = `${claims["first_name"] || "Minha"} Loja`;
    const baseSlug = claims["email"]?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "-") || `loja-${user.id.substring(0, 8)}`;
    
    await storage.createStore({
      userId: user.id,
      name: storeName,
      slug: baseSlug,
      description: "Bem-vindo à minha loja!",
      isActive: true,
    });
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    const user: any = {
      id: claims.sub,
      email: claims.email,
    };
    updateUserSession(user, tokens);
    await upsertUser(claims);
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Get callback URL - always use the current request host
  // This works both in development (.replit.dev) and production (.replit.app)
  const getCallbackURL = (req: any) => {
    const host = req.get('host') || req.hostname;
    const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
    return `${protocol}://${host}/api/callback`;
  };

  // Single strategy (no more per-domain strategies)
  const strategyName = 'replitauth';
  let currentCallbackURL: string | null = null;
  
  const ensureStrategy = (req: any) => {
    const callbackURL = getCallbackURL(req);
    
    console.log('[AUTH] Ensuring strategy | Callback:', callbackURL);
    
    // If callback URL changed or strategy doesn't exist, recreate it
    if (!registeredStrategies.has(strategyName) || currentCallbackURL !== callbackURL) {
      if (registeredStrategies.has(strategyName)) {
        console.log('[AUTH] Recreating strategy with new callback URL');
        // Remove old strategy
        passport.unuse(strategyName);
        registeredStrategies.delete(strategyName);
      }
      
      console.log('[AUTH] Creating strategy with callback:', callbackURL);
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
      currentCallbackURL = callbackURL;
    } else {
      console.log('[AUTH] Using existing strategy');
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const callbackURL = getCallbackURL(req);
    
    console.log('[AUTH] ========== LOGIN ATTEMPT ==========');
    console.log('[AUTH] Using Callback URL:', callbackURL);
    console.log('[AUTH] Request host:', req.get('host'));
    console.log('[AUTH] Request hostname:', req.hostname);
    console.log('[AUTH] Request protocol:', req.protocol);
    console.log('[AUTH] X-Forwarded-Proto:', req.get('x-forwarded-proto'));
    
    ensureStrategy(req);
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const callbackURL = getCallbackURL(req);
    
    console.log('[AUTH] ========== CALLBACK RECEIVED ==========');
    console.log('[AUTH] Expected Callback URL:', callbackURL);
    console.log('[AUTH] Query params:', req.query);
    console.log('[AUTH] Request hostname:', req.hostname);
    
    ensureStrategy(req);
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/dashboard",
      failureRedirect: "/api/login",
    }, (err, user, info) => {
      if (err) {
        console.error('[AUTH] ❌ Callback error:', err);
        return res.redirect('/api/login');
      }
      if (!user) {
        console.error('[AUTH] ❌ No user returned:', info);
        return res.redirect('/api/login');
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('[AUTH] ❌ Login error:', loginErr);
          return res.redirect('/api/login');
        }
        console.log('[AUTH] ✅ Login successful, redirecting to dashboard');
        return res.redirect('/dashboard');
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
