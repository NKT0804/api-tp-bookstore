import express from "express";
import dotenv from "dotenv";
import swaggerUiExpress from "swagger-ui-express";
import YAML from "yamljs";
import cors from "cors";
import connectDatabase from "./config/mongodb.js";

import { notFoundMiddleware, errorhandlingMiddleware } from "./middleware/Errors.js";
import routes from "./routes/index.js";

dotenv.config();
connectDatabase();
const app = express();
const swaggerDocument = YAML.load("./config/swagger.yaml");
app.use(express.static("public"));
app.use(express.json());
app.use(cors());
// api v1.0
//handle route for api
routes(app);

app.use(
    "/thisistpbookstoreswagger",
    swaggerUiExpress.serve,
    swaggerUiExpress.setup(swaggerDocument, {
        swaggerOptions: {
            docExpansion: "none"
        }
    })
);

app.get("/", (req, res) => {
    res.send(
        `Welcome to TPBookstore API, <a href='${
            process.env.WEB_CLIENT_URL || 3000
        }'>Click here to visit the shopping page</a><br>Made by Nguyễn Khắc Tuấn & Nguyễn Viết Phú 01/10/2022`
    );
});

// error handle
app.use(notFoundMiddleware);
app.use(errorhandlingMiddleware);

const PORT = process.env.PORT || 1025;
app.listen(PORT, console.log(`Server run in port ${PORT}`));
