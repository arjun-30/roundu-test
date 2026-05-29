import { match } from 'path-to-regexp';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
  options?: string[];
}

interface Intent {
  patterns: RegExp[];
  response: (context: ChatContext) => string | { text: string; options?: string[] };
}

export interface ChatContext {
  pathname: string;
  userRole: string;
  userName: string;
  walletBalance: number;
  activeBookingsCount: number;
}

// Helper to check if user is asking about navigation
const matchNavigation = (query: string): string | null => {
  const routes: Record<string, string[]> = {
    '/home': ['home', 'dashboard', 'main'],
    '/bookings': ['booking', 'my booking', 'job', 'history', 'upcoming'],
    '/wallet': ['wallet', 'money', 'balance', 'recharge', 'topup'],
    '/profile': ['profile', 'account', 'me', 'details'],
    '/settings': ['setting', 'preference', 'password', 'delete', 'language'],
    '/support': ['support', 'help', 'contact', 'issue', 'report'],
    '/subscriptions': ['subscription', 'plan', 'premium', 'plus', 'member'],
    '/refer-earn': ['refer', 'earn', 'invite', 'friend'],
    '/notifications': ['notification', 'alert', 'message'],
  };

  const normalized = query.toLowerCase();
  for (const [route, keywords] of Object.entries(routes)) {
    if (keywords.some(k => normalized.includes(k))) return route;
  }
  return null;
};

export const chatbotKnowledge: Intent[] = [
  // Greeting
  {
    patterns: [/\b(hi|hello|hey|greetings)\b/i],
    response: (ctx) => ({
      text: `Hi ${ctx.userName || 'there'}! I'm your RoundU Assistant. I can help you with bookings, payments, navigation, or general questions. What do you need help with?`,
      options: ['How to book?', 'Refund policy', 'My Wallet']
    })
  },
  
  // Navigation / "Take me to" / "Where is"
  {
    patterns: [/\b(go to|take me to|where is|how to find|navigate to|open)\b/i],
    response: (ctx) => {
      // Very basic contextual routing
      return `I can help you navigate. Use the bottom navigation bar to access Home, Bookings, Plans, and Profile. For Wallet and Settings, check your Profile menu.`;
    }
  },

  // Booking Flow
  {
    patterns: [/\b(how to book|create booking|new booking|book a service|find a provider)\b/i],
    response: () => `To book a service:\n1. Go to Home and select a category (e.g., Plumber).\n2. Choose a specific issue or "Get Help".\n3. You can either select a specific provider or broadcast to all nearby providers.\n4. Providers will send quotes. Accept one to confirm the booking!`
  },

  // Booking Status
  {
    patterns: [/\b(booking status|track booking|where is provider)\b/i],
    response: (ctx) => {
      if (ctx.activeBookingsCount > 0) {
        return {
          text: `You have ${ctx.activeBookingsCount} active booking(s). You can track the provider's real-time location from the 'Bookings' tab under the 'Active' section.`,
          options: ['Go to Bookings']
        };
      }
      return `You don't have any active bookings right now. You can check your past bookings in the 'Bookings' tab under 'Completed'.`;
    }
  },

  // Cancellation & Refunds
  {
    patterns: [/\b(cancel|refund|cancellation policy|money back)\b/i],
    response: () => ({
      text: `Our cancellation policy is based on how close it is to the booking time:\n- 48+ hours: 100% refund\n- 24 hours: 75%\n- 12 hours: 50%\n- 6 hours: 25%\n- 3 hours: 10%\n- Less than 3 hours: No refund.\nRefunds to the RoundU Wallet are instant.`,
      options: ['How to cancel?']
    })
  },
  
  {
    patterns: [/\b(how to cancel)\b/i],
    response: () => `To cancel a booking, go to 'My Bookings', select the booking, and tap the 'Cancel' option. You will need to provide a reason.`
  },

  // Payments & Wallet
  {
    patterns: [/\b(payment|pay|wallet|add money|upi|cash)\b/i],
    response: (ctx) => `You can pay using RoundU Wallet, UPI (Google Pay/PhonePe), or Cash. Your current wallet balance is ₹${ctx.walletBalance}. Refunds to the wallet are instant.`
  },

  // Subscriptions
  {
    patterns: [/\b(subscription|premium|plus|plan|discount)\b/i],
    response: () => `We offer two plans:\n1. RoundU Plus (₹59/wk or ₹199/mo): 10% discount, priority booking.\n2. RoundU Premium (₹149/wk or ₹499/mo): 15% discount, highest priority, emergency support.\nGo to the 'Plans' tab to subscribe!`
  },

  // Provider Specific
  {
    patterns: [/\b(become provider|join as provider|provider role)\b/i],
    response: (ctx) => {
      if (ctx.userRole === 'provider') {
        return `You are already registered as a provider! You can switch to the provider dashboard from your Profile menu.`;
      }
      return `You can switch to a Provider profile by going to your Profile and selecting "Switch to Provider". You'll need to complete KYC verification via DigiLocker and upload a video portfolio.`;
    }
  },
  
  // KYC / Verification
  {
    patterns: [/\b(kyc|digilocker|verify|verification|background check)\b/i],
    response: () => `All RoundU service providers undergo a strict background check and identity verification via DigiLocker (Aadhaar/PAN) before they can accept bookings.`
  },

  // Referrals
  {
    patterns: [/\b(refer|invite|friend|earn)\b/i],
    response: () => `You can earn rewards by referring friends! Go to 'Refer & Earn' from the Home or Profile menu to get your unique invite link. You'll get ₹500 on their first booking.`
  },

  // Chat/Messaging rules
  {
    patterns: [/\b(chat|message provider|talk to provider)\b/i],
    response: () => `Once a booking is confirmed, you can chat with the provider in-app. Note: Sharing phone numbers or negotiating prices outside the app is against our policy and messages are moderated.`
  },

  // Fallback
  {
    patterns: [/.*/],
    response: (ctx) => ({
      text: `I'm not quite sure about that. I can help you with bookings, payments, refunds, our subscription plans, or navigating the app.`,
      options: ['How to book?', 'Cancellation policy', 'Contact Support']
    })
  }
];

export const getChatbotResponse = (query: string, context: ChatContext): { text: string; options?: string[] } => {
  for (const intent of chatbotKnowledge) {
    if (intent.patterns.some(pattern => pattern.test(query))) {
      const res = intent.response(context);
      if (typeof res === 'string') {
        return { text: res };
      }
      return res;
    }
  }
  return { text: "I didn't understand that." };
};
