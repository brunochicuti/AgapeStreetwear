import {stripe}

export async function POST(req: Request){
    const {items, payment_intent_id } = await req.json();
    console.log(items, payment_intent_id)
}