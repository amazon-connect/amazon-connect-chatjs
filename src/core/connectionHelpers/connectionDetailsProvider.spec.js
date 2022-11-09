import ConnectionDetailsProvider from "./connectionDetailsProvider";
import { ConnectionInfoType } from "./baseConnectionHelper";
import { ACPS_METHODS, CONTENT_TYPE, CSM_CATEGORY, SESSION_TYPES } from "../../constants";
import { csmService } from "../../service/csmService";

describe("ConnectionDetailsProvider", () => {

  const chatClient = {
  };

  let connectionDetailsProvider;
  let participantToken;
  let fetchedConnectionDetails;
  let getConnectionToken;

  function setupCustomer() {
    connectionDetailsProvider = new ConnectionDetailsProvider(participantToken, chatClient, SESSION_TYPES.CUSTOMER);
  }
  function setupAgent() {
    connectionDetailsProvider = new ConnectionDetailsProvider(null, chatClient, SESSION_TYPES.AGENT, getConnectionToken);
  }

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(csmService, 'addLatencyMetricWithStartTime').mockImplementation(() => { });
    jest.spyOn(csmService, 'addCountAndErrorMetric').mockImplementation(() => { });
    fetchedConnectionDetails = {
      ParticipantCredentials: {
        ConnectionAuthenticationToken: 'token',
        Expiry: 0
      },
      url: 'url',
      expiry: 'expiry'
    };

    participantToken = 'ptoken';

    getConnectionToken = jest.fn((function () {
      let counter = 0;
      return () => {
        counter += 1;
        return Promise.resolve({
          chatTokenTransport: {
            participantToken: fetchedConnectionDetails.ParticipantCredentials.ConnectionAuthenticationToken + counter,
            expiry: 0 + counter
          }
        });
      };
    })());

    chatClient.createParticipantConnection = jest.fn((function () {
      let counter = 0;
      return () => {
        counter += 1;
        return Promise.resolve({
          data: {
            ConnectionCredentials: {
              ConnectionToken: fetchedConnectionDetails.ParticipantCredentials.ConnectionAuthenticationToken + counter,
              Expiry: 0 + counter
            },
            Websocket: {
              Url: fetchedConnectionDetails.url + counter,
              ConnectionExpiry: fetchedConnectionDetails.expiry + counter
            }
          }
        });
      };
    })());
  });


  describe("Customer Session", () => {
    describe(".fetchConnectionDetails()", () => {
      test("returns valid url on first call", async () => {
        setupCustomer();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails.url).toEqual("url1");
        expect(connectionDetails.expiry).toEqual("expiry1");
      });

      test("returns valid url on second call", async () => {
        setupCustomer();
        await connectionDetailsProvider.fetchConnectionDetails();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails.url).toEqual("url2");
        expect(connectionDetails.expiry).toEqual("expiry2");
      });

      test("has correct inner state after first call", async () => {
        setupCustomer();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails.url).toEqual("url1");
        expect(connectionDetailsProvider.connectionDetails.expiry).toEqual("expiry1");
        expect(connectionDetailsProvider.connectionToken).toEqual("token1");
        expect(connectionDetailsProvider.connectionTokenExpiry).toEqual(1);
      });

      test("updates internal state on second call", async () => {
        setupCustomer();
        await connectionDetailsProvider.fetchConnectionDetails();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails.url).toEqual("url2");
        expect(connectionDetailsProvider.connectionDetails.expiry).toEqual("expiry2");
        expect(connectionDetailsProvider.connectionToken).toEqual("token2");
        expect(connectionDetailsProvider.connectionTokenExpiry).toEqual(2);

      });

      test("hits API on first call", async () => {
        setupCustomer();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(1);
        expect(chatClient.createParticipantConnection).toHaveBeenLastCalledWith(participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS]);
        expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.CREATE_PARTICIPANT_CONNECTION, CSM_CATEGORY.API, false);
        expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.CREATE_PARTICIPANT_CONNECTION, expect.anything(), CSM_CATEGORY.API);
      });

      test("hits API on second call", async () => {
        setupCustomer();
        await connectionDetailsProvider.fetchConnectionDetails();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(2);
        expect(chatClient.createParticipantConnection).toHaveBeenLastCalledWith(participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS]);
      });

      test("hits API on first call, and createParticipantConnection fails", async () => {
        chatClient.createParticipantConnection = jest.fn(() => Promise.reject({}));
        setupCustomer();
        try {
          await connectionDetailsProvider.fetchConnectionDetails();
          expect(false).toEqual(true);
        } catch (e) {
          expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(1);
          expect(chatClient.createParticipantConnection).toHaveBeenLastCalledWith(participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS]);
          expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.CREATE_PARTICIPANT_CONNECTION, CSM_CATEGORY.API, true);
          expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.CREATE_PARTICIPANT_CONNECTION, expect.anything(), CSM_CATEGORY.API);
        }
      });
    });

    describe(".fetchConnectionToken()", () => {
      test("returns valid connection token on first call", async () => {
        setupCustomer();
        const connectionToken = await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionToken).toBe('token1');
      });

      test("returns valid connection token on second call", async () => {
        setupCustomer();
        await connectionDetailsProvider.fetchConnectionToken();
        const connectionToken = await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionToken).toBe('token2');
      });

      test("has correct inner state after first call", async () => {
        setupCustomer();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token1');
        expect(connectionDetailsProvider.connectionTokenExpiry).toBe(1);
      });

      test("updates internal state on second call", async () => {
        setupCustomer();
        await connectionDetailsProvider.fetchConnectionToken();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token2');
        expect(connectionDetailsProvider.connectionTokenExpiry).toBe(2);
      });

      test("hits API on first call", async () => {
        setupCustomer();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(1);
      });

      test("hits API on second call", async () => {
        setupCustomer();
        await connectionDetailsProvider.fetchConnectionToken();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(2);
        expect(chatClient.createParticipantConnection).toHaveBeenLastCalledWith(participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS]);
      });
    });
  });

  describe("Agent Session", () => {
    describe(".fetchConnectionDetails()", () => {
      test("returns valid url on first call", async () => {
        setupAgent();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails.url).toEqual(null);
        expect(connectionDetails.expiry).toEqual(null);
      });

      test("returns valid url on second call", async () => {
        setupAgent();
        await connectionDetailsProvider.fetchConnectionDetails();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails.url).toEqual(null);
        expect(connectionDetails.expiry).toEqual(null);
      });

      test("has correct inner state after first call", async () => {
        setupAgent();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails.url).toEqual(null);
        expect(connectionDetailsProvider.connectionDetails.expiry).toEqual(null);
        expect(connectionDetailsProvider.connectionToken).toBe('token1');
        expect(connectionDetailsProvider.connectionTokenExpiry).toBe(1);
      });

      test("updates internal state on second call", async () => {
        setupAgent();
        await connectionDetailsProvider.fetchConnectionDetails();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails.url).toEqual(null);
        expect(connectionDetailsProvider.connectionDetails.expiry).toEqual(null);
        expect(connectionDetailsProvider.connectionToken).toBe('token2');
        expect(connectionDetailsProvider.connectionTokenExpiry).toBe(2);
      });

      test("hits API on first call", async () => {
        setupAgent();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(getConnectionToken).toHaveBeenCalledTimes(1);
      });

      test("hits API on second call", async () => {
        setupAgent();
        await connectionDetailsProvider.fetchConnectionDetails();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(getConnectionToken).toHaveBeenCalledTimes(2);
      });
    });

    describe(".fetchConnectionToken()", () => {
      test("returns valid connection token on first call", async () => {
        setupAgent();
        const connectionToken = await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionToken).toBe('token1');
      });

      test("returns valid connection token on second call", async () => {
        setupAgent();
        await connectionDetailsProvider.fetchConnectionToken();
        const connectionToken = await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionToken).toBe('token2');
      });

      test("has correct inner state after first call", async () => {
        setupAgent();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token1');
        expect(connectionDetailsProvider.connectionTokenExpiry).toBe(1);
      });

      test("updates internal state on second call", async () => {
        setupAgent();
        await connectionDetailsProvider.fetchConnectionToken();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token2');
        expect(connectionDetailsProvider.connectionTokenExpiry).toBe(2);
      });

      test("hits API on first call", async () => {
        setupAgent();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(getConnectionToken).toHaveBeenCalledTimes(1);
      });

      test("hits API on second call", async () => {
        setupAgent();
        await connectionDetailsProvider.fetchConnectionToken();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(getConnectionToken).toHaveBeenCalledTimes(2);
      });
    });
  });
});
