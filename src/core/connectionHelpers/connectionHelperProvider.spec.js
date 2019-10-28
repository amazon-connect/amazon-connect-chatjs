import connectionHelperProvider from "./connectionHelperProvider";
import IotConnectionHelper from "./IotConnectionHelper";
import LpcConnectionHelper from "./LpcConnectionHelper";
jest.mock("./IotConnectionHelper");
jest.mock("./LpcConnectionHelper");  

describe("ConnectionHelperProvider", () => {

  const chatClient = {
    createConnectionDetails: () => {},
    createParticipantConnection: () => {}
  };
  const fetchedConnectionDetails = {
    ParticipantCredentials: {
      ConnectionAuthenticationToken: 'token'
    },
    PreSignedConnectionUrl: '.iot.',
    ConnectionId: 'id'
  };
  const fetchedParticipantConnection = {
    Websocket: {
      Url: ".iot."
    },
    ConnectionCredentials: {
      ConnectionToken: "token"
    }
  };

  let contactId;
  let initialContactId;
  let connectionDetails;
  let participantToken;
  let websocketManager;
  let reconnectConfig;
  let createConnectionToken;

  beforeEach(() => {
    contactId = 'id';
    initialContactId = 'id';
    connectionDetails = {};
    participantToken = 'token';
    websocketManager = {};
    reconnectConfig = {};
  });

  function setup() {
    chatClient.createConnectionDetails = jest.fn(() => Promise.resolve({ data: fetchedConnectionDetails }));
    chatClient.createParticipantConnection = jest.fn(() => Promise.resolve({ data: fetchedParticipantConnection }));
  }

  function getConnectionHelper() {
    return connectionHelperProvider.get({
      contactId: contactId, 
      initialContactId: initialContactId, 
      connectionDetails: connectionDetails, 
      participantToken: participantToken, 
      chatClient: chatClient, 
      websocketManager: websocketManager,
      createConnectionToken: createConnectionToken,
      reconnectConfig: reconnectConfig
    });
  }

  test("returns IotConnectionHelper for each call if Connection Url contains .iot.", async () => {
    setup();
    const helper1 = await getConnectionHelper();
    expect(helper1).toBeInstanceOf(IotConnectionHelper);
    const helper2 = await getConnectionHelper();
    expect(helper2).toBeInstanceOf(IotConnectionHelper);
  });


  test("returns LpcConnectionHelper for each call if Connection Url does not contain .iot.", async () => {
    fetchedConnectionDetails.ConnectionId = null;
    fetchedConnectionDetails.PreSignedConnectionUrl = "url";
    fetchedParticipantConnection.Websocket.Url = null;
    setup();
    const helper1 = await getConnectionHelper();
    expect(helper1).toBeInstanceOf(LpcConnectionHelper);
    const helper2 = await getConnectionHelper();
    expect(helper2).toBeInstanceOf(LpcConnectionHelper);
  });
});
