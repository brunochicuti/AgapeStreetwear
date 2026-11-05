"use client";
    import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
    import {Elements, PaymentElement} from "@stripe/react-stripe-js"
    import { useCartStore } from "@/src/store";
    import { useEffect, useState } from "react"

    const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHBLE_KEY!)

    export default function checkout() {
        const cartStore = useCartStore();
        const [clientSecret, setClientSecret] = useState('');

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
                cartStore.setPaymentIntent(data.paymentIntent.id);
                setClientSecret(data.paymentIntent.client_secret);
                console.log(data.paymentIntent);
            })
        }, [cartStore, cartStore.cart, cartStore.paymentIntent]);

        const options: StripeElementsOptions = {
            clientSecret,
            appearance:{
                theme: 'night',
                labels: 'floating',
            }
        }

        return(
            <div>
                {
                    clientSecret ? (
                        <Elements options={options} stripe={stripePromise}>
                            <PaymentElement id="payment-element" options={{layout:'tabs'}}/>
                        </Elements>
                    ) : (
                        <div>
                            <h1>carregando...</h1>
                        </div>
                    )
                }
            </div>
        )
    }