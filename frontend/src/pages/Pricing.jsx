import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';

export default function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: '₹999',
      period: '/month',
      features: ['Up to 50 employees', 'Basic attendance tracking', 'Leave management', 'Email support'],
    },
    {
      name: 'Professional',
      price: '₹2,499',
      period: '/month',
      features: ['Up to 200 employees', 'Advanced attendance', 'Payroll management', 'Priority support', 'Custom reports'],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      features: ['Unlimited employees', 'Full HRMS suite', 'Dedicated account manager', '24/7 support', 'Custom integrations'],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-2xl font-bold text-primary-500">
              DayFlow
            </Link>
            <div className="flex space-x-8">
              <Link to="/" className="hover:text-primary-500 transition-colors">Home</Link>
              <Link to="/about" className="hover:text-primary-500 transition-colors">About</Link>
              <Link to="/pricing" className="hover:text-primary-500 transition-colors">Pricing</Link>
              <Link to="/contact" className="hover:text-primary-500 transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-32 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold mb-6 gradient-text">Simple, Transparent Pricing</h1>
            <p className="text-xl text-gray-400">
              Choose the perfect plan for your organization's needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-2xl border ${
                  plan.popular
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-gray-800 bg-gray-900'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-400">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <Check className="w-5 h-5 text-primary-500 mr-2" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className="w-full py-3 px-6 rounded-lg bg-primary-500 hover:bg-primary-600 transition-colors font-semibold">
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
