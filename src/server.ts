require("dotenv").config();
import limiter from "./lib/rateLimit";
import helmet from "helmet";
import morgan from "morgan";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { pool } from "./db/database";
import routes from "./routes";
// import { authMiddleware } from "./authMiddleware";
// private routes

// public routes

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = ["http://localhost:3000"];

app.use(express.json());
app.use(helmet());
app.use(limiter);

app.use(
    morgan(":method :url :status :res[content-length] - :response-time ms")
);

app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.get("/health", (req: Request, res: Response) => {
    res.status(200).send("Application is healthy!");
});

// public routes

// private routes
app.use("/api", routes);

// root route
app.use("/", (req: Request, res: Response) => {
    res.status(200).send("Server is running!");
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(404).send("Page is not found");
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const shutDownDbConnection = () => {
    server.close(async () => {
        try {
            await pool.end();
            console.log("Database connection closed");
            process.exit(0);
        } catch (error) {
            if (error instanceof Error) {
                console.error("Error closing database connection", error.stack);
            }
            process.exit(0);
        }
    });
};

const shutDownListener = () => {
    process.on("SIGTERM", shutDownDbConnection);
    process.on("SIGINT", shutDownDbConnection);
    process.on("uncaughtException", (err) => {
        console.error((err as Error).message);
        shutDownDbConnection();
    });
    process.on("unhandledRejection", (reason, promise) => {
        console.error("Unhandled Rejection at:", promise, "reason:", reason);
        shutDownDbConnection();
    });
};

shutDownListener();

export default app;
