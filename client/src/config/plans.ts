export interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
}

export const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$9.99/mo',
    features: [
      '5 projects',
      '10GB storage',
      'Email support',
      'Basic analytics',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29.99/mo',
    features: [
      'Unlimited projects',
      '100GB storage',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
      'Team collaboration',
    ],
  },
];
