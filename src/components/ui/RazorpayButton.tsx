import { useEffect, useRef } from 'react';

const BUTTON_ID = 'pl_SsX7tyfZoYzCAn';

export default function RazorpayButton() {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!formRef.current) return;
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/payment-button.js';
    s.setAttribute('data-payment_button_id', BUTTON_ID);
    s.async = true;
    formRef.current.appendChild(s);
    const form = formRef.current;
    return () => { if (form) form.innerHTML = ''; };
  }, []);
  return <form ref={formRef} />;
}
