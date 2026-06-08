export interface ProviderDecisionParams {
  requestedCategory: string;
  providerId: string;
  providerName: string;
  providerCategories: string[];
  onlineStatus: boolean;
  distance: number;
  verificationStatus: boolean;
  decision: string;
}

export const logProviderDecision = (params: ProviderDecisionParams) => {
  console.log(`\n========================================`);
  console.log(`Requested Service Category:\n${params.requestedCategory}`);
  console.log(`Provider ID:\n${params.providerId}`);
  console.log(`Provider Name:\n${params.providerName}`);
  console.log(`Provider Service Categories:\n${JSON.stringify(params.providerCategories)}`);
  console.log(`Provider Online Status:\n${params.onlineStatus}`);
  console.log(`Provider Distance:\n${params.distance.toFixed(2)} KM`);
  console.log(`Provider Verification Status:\n${params.verificationStatus}`);
  console.log(`Notification Decision:\n${params.decision}`);
  console.log(`========================================\n`);
};
