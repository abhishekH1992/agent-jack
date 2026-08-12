import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { Server as SocketServer } from "socket.io";
import Stripe from "stripe";
import { typeDefs } from "./typeDefs/index.js";
import { resolvers } from "./resolvers/index.js";
import { buildContext } from "./context.js";
import { setPriceEmitter, startCooldownJob } from "./services/pricing.js";
import {
  getStripe,
  handleCheckoutCompleted,
  handleCheckoutExpired,
} from "./services/stripe.js";

const PORT = Number(process.env.PORT || 4000);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

async function main() {
  const app = express();
  const httpServer = http.createServer(app);

  const io = new SocketServer(httpServer, {
    cors: { origin: CLIENT_URL, credentials: true },
  });

  setPriceEmitter((event, payload) => {
    io.emit(event, payload);
  });

  io.on("connection", (socket) => {
    socket.on("join:menu", (menuId: string) => {
      socket.join(`menu:${menuId}`);
    });
  });

  app.post(
    "/webhooks/stripe",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!sig || !secret || secret.includes("replace_me")) {
        res.status(400).send("Webhook not configured");
        return;
      }
      try {
        const stripe = getStripe();
        const event = stripe.webhooks.constructEvent(req.body, sig, secret);
        if (event.type === "checkout.session.completed") {
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        }
        if (event.type === "checkout.session.expired") {
          await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        }
        res.json({ received: true });
      } catch (err: any) {
        console.error("Stripe webhook error", err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
      }
    },
  );

  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();

  app.use(
    "/graphql",
    cors({ origin: CLIENT_URL, credentials: true }),
    cookieParser(),
    express.json(),
    expressMiddleware(apollo, {
      context: async ({ req }) => buildContext({ req }),
    }),
  );

  app.get("/health", (_req, res) => res.json({ ok: true }));

  startCooldownJob();

  httpServer.listen(PORT, () => {
    console.log(`API ready at http://localhost:${PORT}/graphql`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
