import mongoose from "mongoose";

const orderSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User"
        },
        phone: {
            type: String,
            require: true
        },
        shippingAddress: {
            type: String,
            required: true
        },
        taxPrice: {
            type: Number,
            required: true,
            default: 0.0
        },
        shippingPrice: {
            type: Number,
            required: true,
            default: 0.0
        },
        totalPrice: {
            type: Number,
            required: true,
            default: 0.0
        },
        confirmed: {
            type: Boolean,
            required: true,
            default: false
        },
        paymentMethod: {
            type: String,
            required: true,
            default: "Thanh toán khi nhận hàng"
        },
        isPaid: {
            type: Boolean,
            required: true,
            default: false
        },
        paidAt: {
            type: Date
        },
        delivered: {
            type: Boolean,
            required: true,
            default: false
        },
        deliveredAt: {
            type: Date
        },
        received: {
            type: Boolean,
            required: true,
            default: false
        },
        cancelled: {
            type: Boolean,
            required: true,
            default: false
        },
        orderItems: [
            {
                name: { type: String, required: true },
                qty: { type: Number, required: true },
                image: { type: String, required: true },
                price: { type: Number, required: true },
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    required: true,
                    ref: "Product"
                }
            }
        ],

        isDisabled: {
            type: Boolean,
            required: false,
            default: false
        }
    },
    {
        timestamps: true
    }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
