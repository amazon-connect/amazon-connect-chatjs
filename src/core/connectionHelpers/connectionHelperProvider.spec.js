import connectionHelperProvider from "./connectionHelperProvider";

import IotConnectionHelper from "./IotConnectionHelper";
import LpcConnectionHelper from "./LpcConnectionHelper";
jest.mock("./IotConnectionHelper");
jest.mock("./LpcConnectionHelper");  

describe("ConnectionHelperProvider", () => {

  const chatClient = {
    createConnectionDetails: () => {}
  };
  const fetchedConnectionDetails = {
    ParticipantCredentials: {
      ConnectionAuthenticationToken: 'token'
    },
    PreSignedConnectionUrl: 'url.iot.',
    ConnectionId: 'id'
  };

  let contactId;
  let participantId;
  let initialContactId;
  let connectionDetails;
  let participantToken;
  let websocketManager;
  let reconnectConfig;
  let createConnectionToken;

  beforeEach(() => {
    contactId = 'id';
    participantId = 'id';
    initialContactId = 'id';
    connectionDetails = {};
    participantToken = 'token';
    websocketManager = {};
    reconnectConfig = {};
  });

  function setup() {
    chatClient.createConnectionDetails = jest.fn(() => Promise.resolve({ data: fetchedConnectionDetails }));
  }

  function getConnectionHelper() {
    return connectionHelperProvider.get({
      contactId: contactId, 
      participantId: participantId, 
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
    fetchedConnectionDetails.PreSignedConnectionUrl = 'url';
    setup();
    const helper1 = await getConnectionHelper();
    expect(helper1).toBeInstanceOf(LpcConnectionHelper);
    const helper2 = await getConnectionHelper();
    expect(helper2).toBeInstanceOf(LpcConnectionHelper);
  });
});
