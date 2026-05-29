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

// ---------------------------------------------------------------------------
// CUSTOMER KNOWLEDGE BASE
// ---------------------------------------------------------------------------
export const customerKnowledge: Intent[] = [
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
    response: () => {
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

  // Fallback
  {
    patterns: [/.*/],
    response: () => ({
      text: `I'm not quite sure about that. I can help you with bookings, payments, refunds, our subscription plans, or navigating the app.`,
      options: ['How to book?', 'Cancellation policy', 'Contact Support']
    })
  }
];

// ---------------------------------------------------------------------------
// PROVIDER KNOWLEDGE BASE
// ---------------------------------------------------------------------------
export const providerKnowledge: Intent[] = [
  // Greeting
  {
    patterns: [/\b(hi|hello|hey|greetings)\b/i],
    response: (ctx) => ({
      text: `Hi ${ctx.userName || 'Provider'}! I'm your Provider Support Manager. I can help you with jobs, earnings, visibility, profile, and membership. How can I help grow your business today?`,
      options: ['Why am I not getting jobs?', 'How do payouts work?', 'Improve visibility']
    })
  },

  // PROFILE & VERIFICATION
  {
    patterns: [/\b(complete profile|setup profile|hidden|invisible)\b/i],
    response: () => `To complete your profile and become visible, ensure you have:\n1. Added your personal details.\n2. Completed DigiLocker KYC verification (Aadhaar/PAN).\n3. Uploaded your Video Portfolio.\n4. Set up your Service Area via GPS Consent.`
  },
  {
    patterns: [/\b(verify|verified|kyc|digilocker)\b/i],
    response: () => `Verification is done via DigiLocker. You need to provide your Aadhaar and PAN details. This ensures trust and safety on the RoundU platform. Go to Documents > DigiLocker KYC to complete it.`
  },
  {
    patterns: [/\b(service area|location|gps)\b/i],
    response: () => `Your service area is determined by your real-time GPS location. You must provide 'Always Allow' GPS consent so we can match you with nearby customers even when the app is in the background.`
  },

  // JOBS & WORKFLOW
  {
    patterns: [/\b(not getting jobs|no jobs|receive requests|getting jobs)\b/i],
    response: (ctx) => {
      if (ctx.activeBookingsCount > 0) {
        return `You currently have an active job. RoundU's 'Active Job Lock' prevents you from receiving new direct requests until your current job is marked as 'Completed'.`;
      }
      return `To get more jobs, ensure:\n1. You are toggled to "Online" on your dashboard.\n2. You do not have an active ongoing job (Job Lock).\n3. Your rating is above 3.5.\n4. You respond quickly to Live Broadcasts.`;
    }
  },
  {
    patterns: [/\b(how are jobs assigned|live broadcast|direct request)\b/i],
    response: () => `Jobs come in two ways:\n1. **Direct Requests**: A customer selects you specifically. You must Accept or Reject.\n2. **Live Broadcasts**: A customer broadcasts to all nearby providers. You must submit a Quote (Price & ETA), and the customer will select a winner.`
  },
  {
    patterns: [/\b(accept|reject|complete a job|job workflow|job status)\b/i],
    response: () => `Job Workflow:\n1. **Accepted/Assigned**: You received the job.\n2. **On the Way**: Tap this when you head to the customer.\n3. **Arrived**: Tap when you reach the location.\n4. **Start Service**: Tap when you begin work.\n5. **Complete Job**: Tap to finish and generate the invoice.`
  },
  {
    patterns: [/\b(cancel|cancelled|miss a request)\b/i],
    response: () => `If you reject or miss too many direct requests, your "Response Rate" drops. If it falls below 50%, your profile may be temporarily hidden. If a customer cancels, you will be notified immediately.`
  },

  // ONLINE STATUS
  {
    patterns: [/\b(online|offline|visible to customers)\b/i],
    response: () => `The Online/Offline toggle is on your Dashboard. You must be Online to receive new direct requests and see Live Broadcasts. If you go Offline, you will be hidden from customer search results.`
  },

  // EARNINGS & PAYOUTS
  {
    patterns: [/\b(earnings|payouts|get paid|payment|withdraw|balance)\b/i],
    response: (ctx) => ({
      text: `Your current wallet balance is ₹${ctx.walletBalance}. Earnings from completed jobs are added here instantly. You can tap "Withdraw to Bank" on the Earnings page to transfer funds to your registered bank account (takes 1-2 business days).`,
      options: ['Where can I see transactions?']
    })
  },
  {
    patterns: [/\b(transactions|history)\b/i],
    response: () => `You can see your completed jobs and earning history by going to the 'Earnings' tab from your Dashboard.`
  },

  // MEMBERSHIP & VISIBILITY
  {
    patterns: [/\b(membership|benefits|upgrade|plans)\b/i],
    response: () => `RoundU offers Provider Memberships (Plus & Premium) that provide:\n- Reduced platform commission.\n- Priority ranking in customer search results.\n- Access to premium high-value jobs.\nGo to 'Membership' to upgrade.`
  },
  {
    patterns: [/\b(visibility|rank|discoverable)\b/i],
    response: () => `To improve your ranking and visibility:\n1. Maintain a rating of 4.5+.\n2. Keep your response rate above 90%.\n3. Upload a high-quality Video Portfolio.\n4. Upgrade to a Plus or Premium membership.`
  },

  // RATINGS & PIP
  {
    patterns: [/\b(rating|reviews|pip|performance)\b/i],
    response: () => `Ratings heavily affect your booking volume. If your rating falls below 3.5, or your response rate drops below 50%, your account enters a Performance Improvement Plan (PIP) and may be restricted. Always aim for 5 stars!`
  },

  // TECH ISSUES
  {
    patterns: [/\b(can't go online|error|bug|issue)\b/i],
    response: () => `If you can't go online, check if you have an active job locking your status, or if you haven't granted GPS permissions. If issues persist, try restarting the app or contact Provider Tech Support.`
  },

  // Fallback
  {
    patterns: [/.*/],
    response: () => ({
      text: `I'm not quite sure about that. As your Provider Support Manager, I can help you with jobs, earnings, visibility, profile setup, and memberships.`,
      options: ['Why am I not getting jobs?', 'How do payouts work?', 'Improve visibility']
    })
  }
];

// ---------------------------------------------------------------------------
// ROUTER
// ---------------------------------------------------------------------------
export const getChatbotResponse = (query: string, context: ChatContext): { text: string; options?: string[] } => {
  const knowledgeBase = context.userRole === 'provider' ? providerKnowledge : customerKnowledge;
  
  for (const intent of knowledgeBase) {
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
