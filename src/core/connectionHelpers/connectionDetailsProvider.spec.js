import ConnectionDetailsProvider from "./connectionDetailsProvider";
import {  ConnectionInfoType } from "./baseConnectionHelper";
import regeneratorRuntime from "regenerator-runtime";

describe("ConnectionDetailsProvider", () => {

  const chatClient = {
  };

  let connectionDetailsProvider;
  let participantToken;
  let fetchedConnectionDetails;

  function setup() {
    connectionDetailsProvider = new ConnectionDetailsProvider(participantToken, chatClient);
  }

  beforeEach(() => {
    fetchedConnectionDetails = {
      ParticipantCredentials: {
        ConnectionAuthenticationToken: 'token',
        Expiry: 1
      },
      url: 'url',
      expiry: 'expiry'
    };

    participantToken = 'ptoken';

    chatClient.createParticipantConnection = jest.fn((function () {
      let counter = 0;
      return () => {
        counter +=1;
        return Promise.resolve({
          data: {
            ConnectionCredentials: {
              ConnectionToken: fetchedConnectionDetails.ParticipantCredentials.ConnectionAuthenticationToken + counter,
              Expiry: 1
            },
            Websocket: {
              Url: fetchedConnectionDetails.url + counter,
              ConnectionExpiry: fetchedConnectionDetails.expiry + counter
            }
          }
        });
      };
    } )());
  });


  describe("With participantToken", () => {
    describe(".fetchConnectionDetails()", () => {
      test("returns valid url on first call", async () => {
        setup();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails.url).toEqual("url1");
        expect(connectionDetails.expiry).toEqual("expiry1");
      });

      test("returns valid url on second call", async () => {
        setup();
        await connectionDetailsProvider.fetchConnectionDetails();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails.url).toEqual("url2");
        expect(connectionDetails.expiry).toEqual("expiry2");
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails.url).toEqual("url1");
        expect(connectionDetailsProvider.connectionDetails.expiry).toEqual("expiry1");
      });

      test("updates internal state on second call", async () => {
        setup();
        await connectionDetailsProvider.fetchConnectionDetails();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails.url).toEqual("url2");
        expect(connectionDetailsProvider.connectionDetails.expiry).toEqual("expiry2");
      });

      test("hits API on first call", async () => {
        setup();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(1);
      });

      test("hits API on second call", async () => {
        setup();
        await connectionDetailsProvider.fetchConnectionDetails();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(2);
        expect(chatClient.createParticipantConnection).toHaveBeenLastCalledWith(participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS]);
      });
    });

    describe(".fetchConnectionToken()", () => {
      test("returns valid connection token on first call", async () => {
        setup();
        const connectionToken = await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionToken).toBe('token1');
      });

      test("returns valid connection token on second call", async () => {
        setup();
        await connectionDetailsProvider.fetchConnectionToken();
        const connectionToken = await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionToken).toBe('token2');
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token1');
      });

      test("updates internal state on second call", async () => {
        setup();
        await connectionDetailsProvider.fetchConnectionToken();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token2');
      });

      test("hits API on first call", async () => {
        setup();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(1);
      });

      test("hits API on second call", async () => {
        setup();
        await connectionDetailsProvider.fetchConnectionToken();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(2);
        expect(chatClient.createParticipantConnection).toHaveBeenLastCalledWith(participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS]);
      });
    });
  });
});
