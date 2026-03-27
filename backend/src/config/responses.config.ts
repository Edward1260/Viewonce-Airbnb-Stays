export enum AiIntent {
  GREETING = 'greeting',
  SEARCH = 'search',
  BOOKING_HELP = 'booking_help',
  COMPLAINT = 'complaint',
  GENERAL = 'general',
}

export const intentMap: { [key: string]: AiIntent } = {
  'hello': AiIntent.GREETING,
  'hi': AiIntent.GREETING,
  'hey': AiIntent.GREETING,
  'find': AiIntent.SEARCH,
  'search': AiIntent.SEARCH,
  'look': AiIntent.SEARCH,
  'book': AiIntent.BOOKING_HELP,
  'cancel': AiIntent.BOOKING_HELP,
  'angry': AiIntent.COMPLAINT,
  'bad': AiIntent.COMPLAINT,
  'expensive': AiIntent.COMPLAINT,
};

export const responseMap: { [key: string]: string[] } = {
  'greeting': [
    'Hello! I am your ViewOnce personal assistant. How can I make your stay in Kenya amazing today?',
    'Hi there! Looking for a perfect getaway or need help with a booking?',
  ],
  'check-in': [
    'Check-in is flexible! You can arrive anytime after 3 PM. For early check-in (before 12 PM), there\'s a small fee of Ksh 2,000. Just let me know your preferred time.',
  ],
  'checkin': [
    'Check-in is flexible! You can arrive anytime after 3 PM. For early check-in (before 12 PM), there\'s a small fee of Ksh 2,000. Just let me know your preferred time.',
  ],
  'check-out': [
    'Check-out is at 11 AM. If you need a later check-out, I can usually accommodate until 2 PM for Ksh 1,500. Just ask!',
  ],
  'checkout': [
    'Check-out is at 11 AM. If you need a later check-out, I can usually accommodate until 2 PM for Ksh 1,500. Just ask!',
  ],
  'parking': [
    'Yes, there\'s secure parking available right outside the property. It\'s free for guests and well-lit at night. Street parking is also available if needed.',
  ],
  'wifi': [
    'The WiFi is super fast (100 Mbps)! The password is \'Welcome2024\'. It covers the entire property including the outdoor areas.',
  ],
  'internet': [
    'The WiFi is super fast (100 Mbps)! The password is \'Welcome2024\'. It covers the entire property including the outdoor areas.',
  ],
  'pets': [
    'I\'m sorry, but pets are not allowed at this property. This is to keep the space clean and comfortable for all guests.',
  ],
  'pet': [
    'I\'m sorry, but pets are not allowed at this property. This is to keep the space clean and comfortable for all guests.',
  ],
  'pool': [
    'The pool is heated and available 24/7! It\'s cleaned daily and the water is always warm. Pool towels are provided in the cabana.',
  ],
  'swimming': [
    'The pool is heated and available 24/7! It\'s cleaned daily and the water is always warm. Pool towels are provided in the cabana.',
  ],
  'kitchen': [
    'The kitchen is fully equipped with everything you need - stove, oven, microwave, fridge, coffee maker, and all the utensils. Feel free to cook as much as you\'d like!',
  ],
  'cook': [
    'The kitchen is fully equipped with everything you need - stove, oven, microwave, fridge, coffee maker, and all the utensils. Feel free to cook as much as you\'d like!',
  ],
  'cleaning': [
    'The property is professionally cleaned before each stay. During your stay, I\'ll check in periodically to ensure everything is perfect. Just let me know if you need anything!',
  ],
  'clean': [
    'The property is professionally cleaned before each stay. During your stay, I\'ll check in periodically to ensure everything is perfect. Just let me know if you need anything!',
  ],
  'cancel': [
    'Our cancellation policy is flexible - free cancellation up to 7 days before check-in. After that, 50% refund. Within 24 hours of check-in, no refund but you can reschedule.',
  ],
  'cancellation': [
    'Our cancellation policy is flexible - free cancellation up to 7 days before check-in. After that, 50% refund. Within 24 hours of check-in, no refund but you can reschedule.',
  ],
  'price': [
    'I can offer you 10% off for a 7+ night stay! Also, mention this chat when booking and I\'ll include a complimentary welcome basket with local treats.',
  ],
  'discount': [
    'I can offer you 10% off for a 7+ night stay! Also, mention this chat when booking and I\'ll include a complimentary welcome basket with local treats.',
  ],
  'location': [
    'Great location! The property is in the heart of everything. I\'ll send you detailed directions and the exact address once booking is confirmed. It\'s a 15-minute drive from the airport.',
  ],
  'directions': [
    'Great location! The property is in the heart of everything. I\'ll send you detailed directions and the exact address once booking is confirmed. It\'s a 15-minute drive from the airport.',
  ],
  'renovation': [
    'The property was recently renovated in 2023! Everything is brand new - furniture, appliances, bedding, and even the plumbing. You\'ll love how modern and comfortable it feels.',
  ],
  'new': [
    'The property was recently renovated in 2023! Everything is brand new - furniture, appliances, bedding, and even the plumbing. You\'ll love how modern and comfortable it feels.',
  ],
  'updated': [
    'The property was recently renovated in 2023! Everything is brand new - furniture, appliances, bedding, and even the plumbing. You\'ll love how modern and comfortable it feels.',
  ],
};

/**
 * Find the best response based on keywords in the user input.
 */
/**
 * Advanced Response Generator
 */
export const getAIResponse = (input: string, context?: any): string => {
  const lowerInput = input.toLowerCase();
  let detectedIntent = AiIntent.GENERAL;

  for (const [key, intent] of Object.entries(intentMap)) {
    if (lowerInput.includes(key)) {
      detectedIntent = intent;
      break;
    }
  }

  if (detectedIntent === AiIntent.GREETING && context?.user?.firstName) {
    return `Welcome back, ${context.user.firstName}! Ready to explore more of ${context?.user?.location || 'Kenya'}?`;
  }

  const options = responseMap[detectedIntent] || responseMap['general'];
  const baseResponse = options ? options[Math.floor(Math.random() * options.length)] : 'How can I help?';
  
  return baseResponse;
};
