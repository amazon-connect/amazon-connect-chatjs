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
  let createConnectionToken;
  let fetchedConnectionToken;

  function setup() {
    connectionDetailsProvider = new ConnectionDetailsProvider(connectionDetails, participantToken, chatClient, createConnectionToken);
  }

  beforeEach(() => {
    connectionDetails = {
      connectionToken: 'token',
      ConnectionId: 'id',
      PreSignedConnectionUrl: '.iot.'
    };
    fetchedConnectionDetails = {
      ParticipantCredentials: {
        ConnectionAuthenticationToken: 'token'
      },
      PreSignedConnectionUrl: '.iot.',
      ConnectionId: 'id'
    };

    fetchedConnectionToken = 'token';
    participantToken = 'ptoken';

    createConnectionToken = jest.fn((function() {
      let counter = 0;
      return () => {
        counter +=1;
        return new Promise(function(resolve, reject) {
          fetchedConnectionToken 
            ? resolve({
                chatTokenTransport: {
                  participantToken: fetchedConnectionToken+counter
                }
              })
            : reject("error in createConnectionToken type chat_token");
        }); 
      };
    } )());
  
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
    } )());
  });

  describe("with ParticipantToken, IOT", () => {
    describe(".init()", () => {
      test("returns valid connection details", async () => {
        setup();
        const connectionDetails = await connectionDetailsProvider.init();
        expect(connectionDetails).toEqual({
          connectionId: 'id1',
          preSignedConnectionUrl: '.iot.1'
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
          preSignedConnectionUrl: '.iot.1'
        });
        expect(connectionDetailsProvider.connectionToken).toEqual('token1');
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
          connectionId: 'id1',
          preSignedConnectionUrl: '.iot.1'
        });
      });

      test("returns valid connection details on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetails).toEqual({
          connectionId: 'id2',
          preSignedConnectionUrl: '.iot.2'
        });
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: 'id1',
          preSignedConnectionUrl: '.iot.1'
        });
      });

      test("updates internal state on second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: 'id2',
          preSignedConnectionUrl: '.iot.2'
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

  describe("with ParticipantToken, LPC", () => {
    beforeEach(() => {
      fetchedConnectionDetails.PreSignedConnectionUrl = 'url';
    });
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

      test("sets connectionType to LPC", async () => {
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

  describe("without ParticipantToken, Static Connection Details (IOT)", () => {
    beforeEach(() => {
      participantToken = null;  
    });

    describe(".init()", () => {
      test("returns valid connection details", async () => {
        setup();
        const connectionDetails = await connectionDetailsProvider.init();
        expect(connectionDetails).toEqual({
          connectionId: 'id',
          preSignedConnectionUrl: '.iot.'
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
          preSignedConnectionUrl: '.iot.'
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
          preSignedConnectionUrl: '.iot.'
        });
      });

      test("throws exception when trying to fetch a second time", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        var error = null;
        try {
          await connectionDetailsProvider.fetchConnectionDetails();
        } catch (e) {
          error = e;
        }
        expect(error).not.toBe(null);
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: 'id',
          preSignedConnectionUrl: '.iot.'
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
        var error = null;
        try {
          await connectionDetailsProvider.fetchConnectionToken();
        } catch (e) {
          error = e;
        }
        expect(error).not.toBe(null);
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token');
      });
    });
  });

  describe("without ParticipantToken, LPC", () => {
    beforeEach(() => {
      participantToken = null;
      connectionDetails = null;
    });

    describe(".init()", () => {
      test("returns valid connection details", async () => {
        setup();
        const connectionDetails = await connectionDetailsProvider.init();
        expect(connectionDetails).toEqual({
          connectionId: null,
          preSignedConnectionUrl: null
        });
      });

      test("does not call createConnection API, does call createConnectionToken API", async () => {
        setup();
        await connectionDetailsProvider.init();
        expect(chatClient.createConnectionDetails).not.toHaveBeenCalled();
        expect(createConnectionToken).toHaveBeenCalledTimes(1);
      });

      test("has correct inner state after call", async () => {
        setup();
        await connectionDetailsProvider.init();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: null,
          preSignedConnectionUrl: null
        });
        expect(connectionDetailsProvider.connectionToken).toEqual('token1');
      });

      test("sets connectionType to LPC", async () => {
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
          preSignedConnectionUrl: null
        });
      });

      test("returns expected details after a second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        const connectionDetails = await connectionDetailsProvider.fetchConnectionDetails();
        expect(createConnectionToken).toHaveBeenCalledTimes(2);
        expect(connectionDetails).toEqual({
          connectionId: null,
          preSignedConnectionUrl: null
        })
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionDetails();
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: null,
          preSignedConnectionUrl: null
        });
      });
    });

    describe(".fetchConnectionToken()", () => {
      test("returns valid connection token on first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        const connectionToken = await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionToken).toBe('token1');
      });

      test("has correct inner state after first call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token1');
      });

      test("has correct inner state after second call", async () => {
        setup();
        await connectionDetailsProvider.init();
        await connectionDetailsProvider.fetchConnectionToken();
        await connectionDetailsProvider.fetchConnectionToken();
        expect(connectionDetailsProvider.connectionToken).toBe('token2');
        expect(connectionDetailsProvider.connectionDetails).toEqual({
          connectionId: null,
          preSignedConnectionUrl: null
        });
      });
    });
  });
});



