import ConnectionDetailsProvider from "./connectionDetailsProvider";
import { ConnectionType } from "./baseConnectionHelper";


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
      PreSignedConnectionUrl: 'url'
    };
    fetchedConnectionDetails = {
      ParticipantCredentials: {
        ConnectionAuthenticationToken: 'token'
      },
      PreSignedConnectionUrl: 'url',
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
  });

  describe("with ParticipantToken", () => {
    describe(".init()", () => {
      test("returns valid connection details", async () => {
        setup();
        const connectionDetails = await connectionDetailsProvider.init();
        expect(connectionDetails).toEqual({
          connectionId: 'id1',
          preSignedConnectionUrl: 'url1'
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
          preSignedConnectionUrl: 'url1'
        });
        expect(connectionDetailsProvider.connectionToken).toEqual('token1');
      });

      test("sets connectionType to IOT with connectionId !== null", async () => {
        setup();
        await connectionDetailsProvider.init();
        expect(connectionDetailsProvider.connectionType).toEqual(ConnectionType.IOT);
      });

      test("sets connectionType to LPC with connectionId === null", async () => {
        fetchedConnectionDetails.ConnectionId = null;
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
          connectionId: 'id1',
          preSignedConnectionUrl: 'url1'
        });
      });

      test("returns valid connection details on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails).toEqual({
          connectionId: 'id2',
          preSignedConnectionUrl: 'url2'
        });
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: 'id1',
          preSignedConnectionUrl: 'url1'
        });
      });

      test("updates internal state on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: 'id2',
          preSignedConnectionUrl: 'url2'
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
          preSignedConnectionUrl: 'url'
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
          preSignedConnectionUrl: 'url'
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
          preSignedConnectionUrl: 'url'
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
          preSignedConnectionUrl: 'url'
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



