'use client'
    import { useCartStore } from "@/src/store";
    import { useEffect } from "react"
    export default function checkout() {
        const cartStore = useCartStore();

        useEffect (() =>{
            fetch('/api/create-payment-intent',{
                method: 'POST',
                headers:{
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    items: cartStore.cart,
                    payment_intent_id: cartStore.paymentIntent,

                }),
            }).then((res) =>{return res.json() }).then((data) =>{
                console.log(data.paymentIntent);
            })
        }, []);
        return(
            <div>
                <h1>Checkout</h1>
            </div>
        )
    }