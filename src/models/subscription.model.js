import mongoose, { Schema } from "mongoose";

const subscriptionSchema = Schema(
    {
        subscriber : {
            type : Schema.Types.ObjectId,
            ref : 'User',   // one who is subscribing
        },
        channel : {
            type : Schema.Types.ObjectId,
            ref : 'User',   // one to whom is being subscribed
        }
    },
    { timestamps : true }
)

export const Subscription = mongoose.model("Subscription", subscriptionSchema);