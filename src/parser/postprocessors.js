'use strict';

const { flatten, nth, join, pipe } = require('ramda');
const { flattenDepth, stubNull } = require('ramda-adjunct');

const cst = require('./cst');
const {
  isHeaders,
  isMessageBody,
  isResponseHandler,
  isResponseRef,
  isHttpVersion,
  isMethod,
} = require('./cst/predicates');

// Type definitions:
//     Data = [*]
//     Location = Number
//     Reject = Object

/**
 * Helpers
 */

// stringify :: Array -> String
const stringify = join('');

// stringifyId :: Array -> string
const stringifyId = pipe(nth(0), stringify);

/**
 * Request file
 */

// requestsFile :: (Data, Location) -> Request
const requestsFile = (data, location) => {
  const requests = flattenDepth(2, [data[2], data[3]]);

  return cst.RequestsFile({
    location,
    children: requests,
  });
};

/**
 * Request
 */

// request :: ([RequestLine,,, Headers,, ResponseHandler, ResponseRef], Location) -> Request
const request = (
  [
    requestLineNode,
    ,
    ,
    headersNode,
    ,
    messageBodyNode,
    responseHandlerNode,
    responseRefNode,
  ],
  location
) => {
  const children = [requestLineNode];

  if (isHeaders(headersNode) && headersNode.children.length > 0) {
    children.push(headersNode);
  }
  if (isMessageBody(messageBodyNode) && messageBodyNode.children.length > 0) {
    children.push(messageBodyNode);
  }
  if (
    isResponseHandler(responseHandlerNode) &&
    responseHandlerNode.children.length > 0
  ) {
    children.push(responseHandlerNode);
  }
  if (isResponseRef(responseRefNode) && responseRefNode.children.length > 0) {
    children.push(responseRefNode);
  }

  return cst.Request({ location, children });
};

/**
 * Request line
 */

// requestLine :: ([Method, RequestTarget, HttpVersion]) -> RequestLine
const requestLine = (
  [methodNode, requestTargetNode, httpVersionNode],
  location
) => {
  const children = [];

  if (isMethod(methodNode)) {
    children.push(methodNode);
  }
  children.push(requestTargetNode);
  if (isHttpVersion(httpVersionNode)) {
    children.push(httpVersionNode);
  }

  return cst.RequestLine({
    location,
    children,
  });
};

// method :: (Data, Location) -> Method
const method = ([httpVerb], location) => {
  return cst.Method({ location, value: httpVerb });
};

// httpVersion :: (Data, Location) -> HttpVersion
const httpVersion = (data, location) => {
  return cst.HttpVersion({
    location,
    value: `${stringify(data[1])}.${stringify(data[3])}`,
  });
};

/**
 * Request target
 */

// requestTarget :: (Data, Location) -> RequestTarget
const requestTarget = (data, location) => {
  return cst.RequestTarget({ location, children: [data[0]] });
};

// originForm :: (Data, Location) -> OriginForm
const originForm = (
  [absolutePathNode, queryMatch, fragmentMatch],
  location
) => {
  const children = [absolutePathNode];

  if (queryMatch !== null) {
    children.push(cst.Literal({ location, value: queryMatch[0] }));
    children.push(queryMatch[1]);
  }
  if (fragmentMatch !== null) {
    children.push(cst.Literal({ location, value: fragmentMatch[0] }));
    children.push(fragmentMatch[1]);
  }

  return cst.OriginForm({
    location,
    children,
  });
};

// absoluteForm :: (Data, Location) -> AbsoluteForm
const absoluteForm = (
  [schemeMatch, hierPartNode, queryMatch, fragmentMatch],
  location
) => {
  const children = [];

  if (schemeMatch !== null) {
    children.push(schemeMatch[0]);
    children.push(cst.Literal({ location, value: schemeMatch[1] }));
  }
  children.push(hierPartNode);
  if (queryMatch !== null) {
    children.push(cst.Literal({ location, value: queryMatch[0] }));
    children.push(queryMatch[1]);
  }
  if (fragmentMatch !== null) {
    children.push(cst.Literal({ location, value: fragmentMatch[0] }));
    children.push(fragmentMatch[1]);
  }

  return cst.AbsoluteForm({
    location,
    children,
  });
};

// asteriskForm :: (Data, Location) -> AsteriskForm
const asteriskForm = (data, location) => {
  return cst.AsteriskForm({ location, value: data[0] });
};

// scheme :: (Data, Location) -> Scheme
const scheme = (data, location) => {
  return cst.Scheme({ location, value: stringify(flatten(data)) });
};

// hierPart :: (Data, Location) -> HierPart
const hierPart = ([authorityNode, absolutePathNode], location) => {
  return cst.HierPart({
    location,
    children: [authorityNode, absolutePathNode],
  });
};

/**
 * Authority.
 */

// authority :: (Data, Location) -> Authority
const authority = (data, location) => {
  const [hostNode] = data;
  const children = [hostNode];

  // optional port
  if (Array.isArray(data[1])) {
    children.push(cst.Literal({ location, value: data[1][0] }));
    children.push(data[1][1]);
  }

  return cst.Authority({ location, children });
};

// port :: (Data, Location) -> Port
const port = (data, location) => {
  return cst.Port({ location, value: stringifyId(data) });
};

// host :: (Data, Location) -> Host
const host = (data, location) => {
  const children = [];

  if (data[0].length === 3) {
    // ipv6 with brackets
    children.push(cst.Literal({ location, value: data[0][0] }));
    children.push(data[0][1]);
    children.push(cst.Literal({ location, value: data[0][2] }));
  } else {
    // ipv4 or reg name
    children.push(data[0][0]);
  }

  return cst.Host({ location, children });
};

// ipv6Address :: (Data, Location) -> Ipv6Address
const ipv6Address = (data, location) => {
  return cst.Ipv6Address({ location, value: stringifyId(data) });
};

// ipv4-or-reg-name :: (Data, Location) -> Ipv4OrRegName
const ipv4OrRegName = (data, location) => {
  return cst.Ipv4OrRegName({ location, value: stringifyId(data) });
};

/**
 * Resource path.
 */

// absolutePath :: (Data, Location) -> AbsolutePath
const absolutePath = (data, location) => {
  return cst.AbsolutePath({
    location,
    children: flatten(data),
  });
};

// pathSeparator :: (Data, Location) -> PathSeparator
const pathSeparator = (data, location) => {
  return cst.PathSeparator({ location, value: data[0] });
};

// segment :: (Data, Location) -> Segment
const segment = (data, location) => {
  return cst.Segment({ location, value: stringifyId(data) });
};

/**
 * Query and Fragment
 */

// query :: (Data, Location) -> Query
const query = (data, location) => {
  return cst.Query({ location, value: stringifyId(data) });
};

// fragment :: (Data, Location) -> Fragment
const fragment = (data, location) => {
  return cst.Fragment({ location, value: stringifyId(data) });
};

/**
 * Headers
 */

// headers :: (Data, Location) -> Headers
const headers = (data, location) => {
  return cst.Headers({ location, children: [...data[0]] });
};

// headerField :: (Data, Location) -> HeaderField
const headerField = (data, location) => {
  return cst.HeaderField({ location, children: [data[0], data[3]] });
};

// fieldName :: (Data, Location) -> FieldName
const fieldName = (data, location) => {
  return cst.FieldName({ location, value: stringifyId(data) });
};

// fieldValue :: (Data, Location, Reject) -> FieldValue | Reject
const fieldValue = (data, location, reject) => {
  const lineTail = stringifyId(data);

  if (lineTail.startsWith(' ') || lineTail.endsWith(' ')) {
    return reject;
  }

  return cst.FieldValue({ location, value: lineTail });
};

/**
 * Message body
 */

// messageBody :: (Data, Location) -> MessageBody
const messageBody = (data, location) => {
  const children = [];
  const messages = data[0];

  if (messages.children.length > 0) {
    children.push(messages);
  }

  return cst.MessageBody({ location, children });
};

// messages :: (Data, Location) -> Messages
const messages = (data, location) => {
  return cst.Messages({ location, children: [...data[0]] });
};

// messageLine :: (Data, Location, Reject) -> MessageLine | Reject
const messageLine = (data, location, reject) => {
  const lineTail = stringifyId(data);

  if (
    lineTail.includes('<') ||
    lineTail.includes('> ') ||
    lineTail.includes('<> ') ||
    lineTail.includes('###')
  ) {
    return reject;
  }

  return cst.MessageLine({ location, value: lineTail });
};

// inputFileRef :: (Data, Location) -> InputFileRef
const inputFileRef = (data, location) => {
  return cst.InputFileRef({ location, children: [data[2]] });
};

// filePath :: (Data, Location) -> FilePath
const filePath = (data, location) => {
  return cst.FilePath({ location, value: stringifyId(data) });
};

/**
 * Response handler
 */

// responseHandler :: (Data, Location) -> ResponseHandler
const responseHandler = (data, location) => {
  return cst.ResponseHandler({ location, children: [data[0]] });
};

// responseHandlerFilePath :: (Data, Number, Reject) -> String
const responseHandlerFilePath = (data, location, reject) => {
  const filePathNode = data[2];

  if (filePathNode.value.startsWith('{%')) return reject;

  return filePathNode;
};

// handlerScript :: (Data, Number, Reject) -> HandlerScript
const handlerScript = (data, location, reject) => {
  const script = stringify(data[1]);

  if (script.includes('%}') || script.includes('###')) return reject;

  return cst.HandlerScript({ location, value: script });
};

/**
 * Response reference
 */

// responseRef :: (Data, Location) -> ResponseRef
const responseRef = (data, location) => {
  return cst.ResponseRef({ location, children: [data[2]] });
};

/**
 * Line Terminators
 */

// lineTail :: Data -> String
const lineTail = (data) => stringifyId(data);

/**
 * Comments
 */

// lineComment :: (Data, Number, Reject) -> String
const lineComment = (data, location, reject) => {
  if (data[1].includes('##')) return reject;

  return data[1];
};

/**
 * Environment variables
 */

// envVariable :: (Data, Location) -> EnvVariable
const envVariable = (data, location) => {
  return cst.EnvVariable({ location, value: stringify(flatten(data)) });
};

module.exports = {
  // general postprocessors
  nth,
  stubNull,
  stringifyId,
  // Request file
  requestsFile,
  // Request
  request,
  // Request line
  requestLine,
  method,
  httpVersion,
  // Request Target
  requestTarget,
  originForm,
  absoluteForm,
  asteriskForm,
  scheme,
  hierPart,
  // Authority
  authority,
  port,
  host,
  ipv6Address,
  ipv4OrRegName,
  // Resource path
  absolutePath,
  pathSeparator,
  segment,
  // Query and Fragment
  query,
  fragment,
  // Headers
  headers,
  headerField,
  fieldName,
  fieldValue,
  // Message body
  messageBody,
  messages,
  messageLine,
  inputFileRef,
  filePath,
  // Response handler
  responseHandler,
  responseHandlerFilePath,
  handlerScript,
  // Response reference
  responseRef,
  // Line Terminators
  lineTail,
  // Comments
  lineComment,
  // Environment variables
  envVariable,
};
