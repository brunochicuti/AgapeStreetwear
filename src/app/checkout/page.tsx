import { useState } from "react";
import Checkout from "../components/checkout";

const [clientSecret, setClientSecret] = useState('');

export default function CheckoutPage() {
  return <Checkout />;
}