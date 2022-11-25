import orderRouter from "./orderRoutes.js";
import productRouter from "./productRoutes.js";
import userRouter from "./userRoutes.js";
import categoryRouter from "./categoryRoutes.js";
import cartRouter from "./cartRoutes.js";
import bannerRouter from "./bannerRoutes.js";
import commentRouter from "./commentRoutes.js";
import refreshTokenRouter from "./refreshTokenRoutes.js";

const routes = (app) => {
    app.use("/api/v1/order", orderRouter);
    app.use("/api/v1/product", productRouter);
    app.use("/api/v1/user", userRouter);
    app.use("/api/v1/category", categoryRouter);
    app.use("/api/v1/cart", cartRouter);
    app.use("/api/v1/comment", commentRouter);
    app.use("/api/v1/banner", bannerRouter);
    app.use("/api/v1/refresh-token", refreshTokenRouter);
};
export default routes;
