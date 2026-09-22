import axios from 'axios';

export interface MetaMockState {
  shouldFailAdSet?: boolean;
  shouldFailAd?: boolean;
  shouldFailCampaign?: boolean;
  adSetErrorMessage?: string;
  eventsReceivedCount?: number;
}

export const defaultMetaMockState: MetaMockState = {
  shouldFailAdSet: false,
  shouldFailAd: false,
  shouldFailCampaign: false,
  adSetErrorMessage: 'Simulated AdSet creation failure',
  eventsReceivedCount: 1,
};

export class MetaGraphApiMockServer {
  private state: MetaMockState = { ...defaultMetaMockState };
  private originalGet: typeof axios.get | null = null;
  private originalPost: typeof axios.post | null = null;

  public calls: { method: string; url: string; data?: any; params?: any }[] = [];

  public configure(newState: Partial<MetaMockState>) {
    this.state = { ...this.state, ...newState };
  }

  public reset() {
    this.state = { ...defaultMetaMockState };
    this.calls = [];
  }

  public listen() {
    this.originalGet = axios.get;
    this.originalPost = axios.post;

    const self = this;

    jest.spyOn(axios, 'get').mockImplementation(async (url: string, config?: any) => {
      self.calls.push({ method: 'GET', url, params: config?.params });

      if (url.includes('/adaccounts') || url.endsWith('/adaccounts')) {
        return {
          data: {
            data: [{ id: 'act_123456789', name: 'Test Ad Account', currency: 'BDT' }],
          },
        };
      }

      if (url.includes('/insights')) {
        return {
          data: {
            data: [
              {
                impressions: '1000',
                spend: '50.00',
                clicks: '35',
                actions: [{ action_type: 'purchase', value: '5' }],
              },
            ],
          },
        };
      }

      if (url.includes('/campaigns')) {
        return {
          data: {
            data: [
              {
                id: 'campaign_123',
                name: 'Summer Sale Promo',
                status: 'ACTIVE',
                daily_budget: '50000',
              },
            ],
          },
        };
      }

      if (url.includes('/adsets')) {
        return {
          data: {
            data: [
              {
                id: 'adset_123',
                name: 'Dhaka Target Audience',
                status: 'ACTIVE',
                daily_budget: '50000',
              },
            ],
          },
        };
      }

      // Default ad account balance response or general Graph API ping
      return {
        data: {
          account_id: '123456789',
          name: 'Test Ad Account',
          account_status: 1,
          balance: '0',
          currency: 'BDT',
          spend_cap: '1000000',
          amount_spent: '5000',
          min_daily_budget: '1000',
          id: 'act_123456789',
        },
      };
    });

    jest.spyOn(axios, 'post').mockImplementation(async (url: string, data?: any, config?: any) => {
      self.calls.push({ method: 'POST', url, data, params: config?.params });

      // CAPI Events
      if (url.includes('/events')) {
        return {
          data: {
            events_received: self.state.eventsReceivedCount ?? 1,
            messages: [],
            fbtrace_id: 'test_trace_id_capi_123',
          },
        };
      }

      // Image upload
      if (url.includes('/adimages')) {
        return {
          data: {
            images: {
              product_image: {
                hash: 'test_meta_image_hash_987654321',
                url: 'https://graph.facebook.com/v21.0/image_url',
              },
            },
          },
        };
      }

      // Campaign creation
      if (url.includes('/campaigns')) {
        if (self.state.shouldFailCampaign) {
          const error: any = new Error('Meta API Error: Campaign creation failed');
          error.response = {
            status: 400,
            data: { error: { message: 'Invalid campaign parameters', code: 100 } },
          };
          throw error;
        }
        return {
          data: { id: 'campaign_meta_id_999' },
        };
      }

      // AdSet creation
      if (url.includes('/adsets')) {
        if (self.state.shouldFailAdSet) {
          const error: any = new Error('Meta API Error: AdSet creation failed');
          error.response = {
            status: 400,
            data: { error: { message: self.state.adSetErrorMessage || 'Simulated AdSet failure', code: 100 } },
          };
          throw error;
        }
        return {
          data: { id: 'adset_meta_id_888' },
        };
      }

      // Ad creation
      if (url.includes('/ads')) {
        if (self.state.shouldFailAd) {
          const error: any = new Error('Meta API Error: Ad creation failed');
          error.response = {
            status: 400,
            data: { error: { message: 'Policy violation in ad creative', code: 1487390 } },
          };
          throw error;
        }
        return {
          data: { id: 'ad_meta_id_777' },
        };
      }

      // Default POST response
      return {
        data: { success: true, id: 'meta_post_res_123' },
      };
    });
  }

  public resetHandlers() {
    this.reset();
  }

  public close() {
    jest.restoreAllMocks();
  }
}

export const metaMockServer = new MetaGraphApiMockServer();
