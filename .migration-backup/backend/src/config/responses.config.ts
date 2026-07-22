export enum AiIntent {
  GREETING = 'greeting',
  SEARCH = 'search',
  BOOKING_HELP = 'booking_help',
  COMPLAINT = 'complaint',
  PAYMENT = 'payment',
  AMENITIES = 'amenities',
  GENERAL = 'general',
}

export const intentMap: { [key: string]: AiIntent } = {
  'hello': AiIntent.GREETING,
  'hi': AiIntent.GREETING,
  'hey': AiIntent.GREETING,
  'find': AiIntent.SEARCH,
  'search': AiIntent.SEARCH,
  'look': AiIntent.SEARCH,
  'where': AiIntent.SEARCH,
  'available': AiIntent.SEARCH,
  'book': AiIntent.BOOKING_HELP,
  'cancel': AiIntent.BOOKING_HELP,
  'reservation': AiIntent.BOOKING_HELP,
  'angry': AiIntent.COMPLAINT,
  'bad': AiIntent.COMPLAINT,
  'expensive': AiIntent.COMPLAINT,
  'help': AiIntent.GENERAL,
  'what can you do': AiIntent.GENERAL,
  'pay': AiIntent.PAYMENT,
  'mpesa': AiIntent.PAYMENT,
  'cost': AiIntent.PAYMENT,
  'wifi': AiIntent.AMENITIES,
  'pool': AiIntent.AMENITIES,
  'parking': AiIntent.AMENITIES,
};

export const responseMap: { [key: string]: string[] } = {
  'greeting': [
    "Hello! I'm your ViewOnce personal concierge. I can help you find the perfect stay in Kenya, manage your bookings, or answer questions about amenities. What's on your mind today?",
    "Hi there! It's great to see you. Are you looking for a new adventure or do you need assistance with an existing reservation?",
  ],
  'search': [
    "I'd be happy to help you find a place! We have beautiful listings in Nairobi, Mombasa, and across the Rift Valley. You can filter by price or property type in your dashboard, or just tell me what kind of vibe you're looking for.",
    "Looking for a getaway? I can help you discover unique stays. Try searching for 'Beachfront in Mombasa' or 'Luxury lofts in Nairobi' using the search bar above!",
  ],
  'booking_help': [
    "Managing your stay is easy. You can view all your active reservations in the 'Bookings' section. If you need to modify or cancel, I recommend checking the specific property's cancellation policy first. Do you have a specific booking ID you're asking about?",
    "I can certainly help with that. Most of our hosts offer flexible check-ins. If you need to cancel, navigate to your 'My History' page or the 'Bookings' tab to see your options.",
  ],
  'payment': [
    "We support secure payments via M-Pesa, Credit Cards, and Bank Transfers. Payouts for hosts and refunds for guests are handled automatically based on our secure escrow system. Would you like to see your transaction history?",
    "Transactions are processed instantly. If you're having trouble with an M-Pesa STK push, ensure your phone is unlocked and you have sufficient balance.",
  ],
  'amenities': [
    "Our premium listings usually include high-speed WiFi, secure parking, and often luxuries like pools or gyms. You can find the full list of features under the 'Amenities' section of any property page.",
    "Looking for specific features? Most properties in Nairobi CBD offer 24/7 security and dedicated workspaces. Anything specific you need for your stay?",
  ],
  'general': [
    "I'm not entirely sure about that specific request, but I can help you search for properties, check your booking status, or explain our payment methods. Would you like to see our most popular stays in Nairobi?",
    "That's a great question! While I'm still learning, I can assist with most things related to your ViewOnce account. Try asking me about 'refunds' or 'how to find a pool'.",
  ]
};

export const getAIResponse = (input: string, context?: any): string => {
  const lowerInput = input.toLowerCase();
  let detectedIntent = AiIntent.GENERAL;
  let matchFound = false;

  for (const [key, intent] of Object.entries(intentMap)) {
    if (lowerInput.includes(key)) {
      detectedIntent = intent;
      matchFound = true;
      break;
    }
  }

  if (detectedIntent === AiIntent.GREETING && context?.user?.firstName) {
    return `Welcome back, ${context.user.firstName}! It's great to have you here again. Ready to explore more unique stays in ${context?.user?.location || 'Kenya'}? I've noticed some new luxury spots you might love.`;
  }

  if (!matchFound) {
    return "I'm sorry, I didn't quite catch that. To assist you better, would you like to: \n1. Search for new properties? \n2. Check your current bookings? \n3. Learn about M-Pesa payments?";
  }

  const options = responseMap[detectedIntent] || responseMap['general'];
  const baseResponse = options ? options[Math.floor(Math.random() * options.length)] : 'How can I help?';
  
  return baseResponse;
};
