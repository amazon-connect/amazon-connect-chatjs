import ConnectionDetailsProvider from "./connectionDetailsProvider";
import { ConnectionType, ConnectionInfoType } from "./baseConnectionHelper";


describe("ConnectionDetailsProvider", () => {

  const chatClient = {
    createConnectionDetails: () => {}
  };

  let connectionDetailsProvider;
  let connectionDetails;
  let participantToken;
  let fetchedConnectionDetails;

  function setup() {
    connectionDetailsProvider = new ConnectionDetailsProvider(connectionDetails, participantToken, chatClient);
  }


  beforeEach(() => {
    connectionDetails = {
      connectionToken: 'token',
      ConnectionId: 'id',
      PreSignedConnectionUrl: '.iot.url'
    };
    fetchedConnectionDetails = {
      ParticipantCredentials: {
        ConnectionAuthenticationToken: 'token'
      },
      PreSignedConnectionUrl: '.iot.url',
      ConnectionId: 'id'
    };
    participantToken = 'ptoken';
    chatClient.createConnectionDetails = jest.fn((function () {
      let counter = 0;
      return () => {
        counter += 1;
        return fetchedConnectionDetails
          ? Promise.resolve({ data: {
            ParticipantCredentials: {
              ConnectionAuthenticationToken: fetchedConnectionDetails.ParticipantCredentials.ConnectionAuthenticationToken + counter
            },
            PreSignedConnectionUrl: fetchedConnectionDetails.PreSignedConnectionUrl + counter,
            ConnectionId: fetchedConnectionDetails.ConnectionId ? fetchedConnectionDetails.ConnectionId + counter : null
          } })
          : Promise.reject('error');
      };
    } ()));

    chatClient.createParticipantConnection = jest.fn((function () {
      let counter = 0;
      return () => {
        counter +=1;
        return Promise.resolve({
          data: {
            ConnectionCredentials: {
              ConnectionToken: fetchedConnectionDetails.ParticipantCredentials.ConnectionAuthenticationToken + counter
            },
            Websocket: {
              Url: fetchedConnectionDetails.PreSignedConnectionUrl + counter
            }
          }
        });
      };
    } )());
  });

  describe("with ParticipantToken, with IOT", () => {
    describe(".init()", () => {
      test("returns valid connection details", async () => {
        setup();
        const connectionDetails = await connectionDetailsProvider.init();
        expect(connectionDetails).toEqual({
          connectionId: 'id1',
          preSignedConnectionUrl: '.iot.url1'
        });
      });

      test("calls createConnectionDetails API", async () => {
        setup();
        await connectionDetailsProvider.init();
        expect(chatClient.createConnectionDetails).toHaveBeenCalledWith(participantToken);
      });

      test("has correct inner state after call", async () => {
        setup();
        await connectionDetailsProvider.init();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: 'id1',
          preSignedConnectionUrl: '.iot.url1'
        });
        expect(connectionDetailsProvider.connectionToken).toEqual('token1');
      });

      test("sets connectionType to IOT with connectionId !== null", async () => {
        fetchedConnectionDetails.PreSignedConnectionUrl = ".iot.";
        setup();
        await connectionDetailsProvider.init();
        expect(connectionDetailsProvider.connectionType).toEqual(ConnectionType.IOT);
      });

    });

    describe(".fetchConnectionDetails()", () => {
      test("returns valid connection details on first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails).toEqual({
          connectionId: 'id1',
          preSignedConnectionUrl: '.iot.url1'
        });
      });

      test("returns valid connection details on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails).toEqual({
          connectionId: 'id2',
          preSignedConnectionUrl: '.iot.url2'
        });
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: 'id1',
          preSignedConnectionUrl: '.iot.url1'
        });
      });

      test("updates internal state on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: 'id2',
          preSignedConnectionUrl: '.iot.url2'
        });
      });

      test("doesn't hit API on first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(chatClient.createConnectionDetails).toHaveBeenCalledTimes(1);
      });

      test("hits API on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(chatClient.createConnectionDetails).toHaveBeenCalledTimes(2);
        expect(chatClient.createConnectionDetails).toHaveBeenLastCalledWith(participantToken);
      });
    });


    describe(".fetchConnectionToken()", () => {
      test("returns valid connection token on first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        const connectionToken = await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionToken).toBe('token1');
      });

      test("returns valid connection token on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        const connectionToken = await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionToken).toBe('token2');
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token1');
      });

      test("updates internal state on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token2');
      });

      test("doesn't hit API on first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(chatClient.createConnectionDetails).toHaveBeenCalledTimes(1);
      });

      test("hits API on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(chatClient.createConnectionDetails).toHaveBeenCalledTimes(2);
        expect(chatClient.createConnectionDetails).toHaveBeenLastCalledWith(participantToken);
      });
    });
  });

  describe("with ParticipantToken, with LPC", () => {
    beforeEach(() => {
      fetchedConnectionDetails.PreSignedConnectionUrl = "url";
      fetchedConnectionDetails.ConnectionId = null;
    });

    describe(".init()", () => {
      test("returns valid connection details", async () => {
        setup();
        const connectionDetails = await connectionDetailsProvider.init();
        expect(connectionDetails).toEqual({
          connectionId: null,
          preSignedConnectionUrl: 'url1'
        });
      });

      test("calls createConnectionDetails API", async () => {
        setup();
        await connectionDetailsProvider.init();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledWith(participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS]);
      });

      test("has correct inner state after call", async () => {
        setup();
        await connectionDetailsProvider.init();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: null,
          preSignedConnectionUrl: 'url1'
        });
        expect(connectionDetailsProvider.connectionToken).toEqual('token1');
      });

      test("sets connectionType to LPC with connectionId === null and with URL not containing '.iot.'", async () => {
        setup();
        await connectionDetailsProvider.init();
        expect(connectionDetailsProvider.connectionType).toEqual(ConnectionType.LPC);
      });
    });

    describe(".fetchConnectionDetails()", () => {
      test("returns valid connection details on first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails).toEqual({
          connectionId: null,
          preSignedConnectionUrl: 'url1'
        });
      });

      test("returns valid connection details on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails).toEqual({
          connectionId: null,
          preSignedConnectionUrl: 'url2'
        });
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: null,
          preSignedConnectionUrl: 'url1'
        });
      });

      test("updates internal state on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: null,
          preSignedConnectionUrl: 'url2'
        });
      });

      test("doesn't hit API on first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(1);
      });

      test("hits API on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(2);
        expect(chatClient.createParticipantConnection).toHaveBeenLastCalledWith(participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS]);
      });
    });


    describe(".fetchConnectionToken()", () => {
      test("returns valid connection token on first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        const connectionToken = await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionToken).toBe('token1');
      });

      test("returns valid connection token on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        const connectionToken = await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionToken).toBe('token2');
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token1');
      });

      test("updates internal state on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token2');
      });

      test("doesn't hit API on first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(1);
      });

      test("hits API on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(chatClient.createParticipantConnection).toHaveBeenCalledTimes(2);
        expect(chatClient.createParticipantConnection).toHaveBeenLastCalledWith(participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS]);
      });
    });
  });

  describe("without ParticipantToken", () => {

    beforeEach(() => {
      participantToken = null;  
    });

    describe(".init()", () => {
      test("returns valid connection details", async () => {
        setup();
        const connectionDetails = await connectionDetailsProvider.init();
        expect(connectionDetails).toEqual({
          connectionId: 'id',
          preSignedConnectionUrl: '.iot.url'
        });
      });

      test("does not call createConnection API", async () => {
        setup();
        await connectionDetailsProvider.init();
        expect(chatClient.createConnectionDetails).not.toHaveBeenCalled();
      });

      test("has correct inner state after call", async () => {
        setup();
        await connectionDetailsProvider.init();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: 'id',
          preSignedConnectionUrl: '.iot.url'
        });
        expect(connectionDetailsProvider.connectionToken).toEqual('token');
      });

      test("sets connectionType to IOT", async () => {
        setup();
        await connectionDetailsProvider.init();
        expect(connectionDetailsProvider.connectionType).toEqual(ConnectionType.IOT);
      });
    });

    describe(".fetchConnectionDetails()", () => {
      test("returns valid connection details on first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails).toEqual({
          connectionId: 'id',
          preSignedConnectionUrl: '.iot.url'
        });
      });

      test("throws exception when trying to fetch a second time", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        try {
          await connectionDetailsProvider.fetchConnectionDetails();
        } catch (e) {
          expect(e.length).toBeGreaterThan(0);
        }
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: 'id',
          preSignedConnectionUrl: '.iot.url'
        });
      });
    });

    describe(".fetchConnectionToken()", () => {
      test("returns valid connection token on first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        const connectionToken = await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionToken).toBe('token');
      });

      test("throws exception when trying to fetch a second time", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        try {
          await connectionDetailsProvider.fetchConnectionToken();
        } catch (e) {
          expect(e.length).toBeGreaterThan(0);
        }
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token');
      });
    });
  });
});



