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
    PreSignedConnectionUrl: 'url',
    ConnectionId: 'id'
  };

  let contactId;
  let initialContactId;
  let connectionDetails;
  let participantToken;
  let websocketManager;
  let reconnectConfig;

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
  }

  function getConnectionHelper() {
    return connectionHelperProvider.get({contactId, initialContactId, connectionDetails, participantToken, chatClient, websocketManager, reconnectConfig});
  }

  test("returns IotConnectionHelper for each call if ConnectionId !== null", async () => {
    setup();
    const helper1 = await getConnectionHelper();
    expect(helper1).toBeInstanceOf(IotConnectionHelper);
    const helper2 = await getConnectionHelper();
    expect(helper2).toBeInstanceOf(IotConnectionHelper);
  });

  test("returns LpcConnectionHelper for each call if ConnectionId === null", async () => {
    fetchedConnectionDetails.ConnectionId = null;
    setup();
    const helper1 = await getConnectionHelper();
    expect(helper1).toBeInstanceOf(LpcConnectionHelper);
    const helper2 = await getConnectionHelper();
    expect(helper2).toBeInstanceOf(LpcConnectionHelper);
  });
});
