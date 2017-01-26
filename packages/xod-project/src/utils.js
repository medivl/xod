import R from 'ramda';
import { Maybe, Either } from 'ramda-fantasy';
import shortid from 'shortid';

import * as Tools from './func-tools';
import * as CONST from './constants';
/**
 * Contains resulting value or error
 *
 * See: {@link https://github.com/ramda/ramda-fantasy/blob/master/docs/Either.md}
 *
 * @external Either
 */

/**
 * Contains resulting value or null
 *
 * See: {@link https://github.com/ramda/ramda-fantasy/blob/master/docs/Maybe.md}
 *
 * @external Maybe
 */

 /**
  * A special object for triggering nodes without passing data.
  *
  * @typedef {Object} Pulse
  */

/**
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 */

/**
 * @private
 * @function getBaseName
 * @param {string} path
 * @returns {string}
 */
export const getBaseName = R.compose(
  R.last,
  R.split('/')
);

/**
 * @private
 * @function explode
 * @param {Maybe|Either}
 * @returns {*}
 * @throws Error
 */
export const explode = R.cond([
  [Maybe.isJust, R.chain(R.identity)],
  [Maybe.isNothing, () => { throw new Error(CONST.ERROR.EXPLODE_NOTHING); }],
  [R.is(Either), Either.either(
    (val) => { throw new Error(CONST.ERROR.EXPLODE_LEFT + val); },
    R.identity
  )],
  [R.T, () => { throw new Error(CONST.ERROR.EXPLODE_NOT_A_MONAD); }],
]);
// R.compose(
//   R.chain(R.identity),
//   R.when(
//     Either.isLeft,
//
//   ),
//   R.when(
//     Maybe.isNothing,
//     () => { throw new Error('Maybe is expected to be Just, but its Nothing'); }
//   )
// );

/**
 * @function isPathLocal
 * @param {string} path
 * @returns {boolean}
 */
export const isPathLocal = R.test(/^@\/[a-zA-Z0-9_\-/]+$/);

/**
 * @function isPathLibrary
 * @param {string} path
 * @returns {boolean}
 */
export const isPathLibrary = R.test(/^[a-zA-Z0-9_\-/]+$/);

/**
 * Checks if a path is a valid for entities like
 * project path, patch path component, etc
 *
 * @function validatePath
 * @param {string} path - string to check
 * @returns {Either<Error|string>} error or valid path
 */
export const validatePath = Tools.errOnFalse(
  CONST.ERROR.PATH_INVALID,
  R.allPass([
    R.complement(R.isNil),
    R.test(/^(@\/)?[a-zA-Z0-9_\-/]+$/),
  ])
);

/**
 * Adds a slash to the end of string if it doesn't exist
 * @private
 * @function ensureEndsWithSlash
 * @param {string} str
 * @returns {string}
 */
export const ensureEndsWithSlash = R.ifElse(
  R.compose(
    R.equals('/'),
    R.last
  ),
  R.identity,
  R.concat(R.__, '/')
);

/**
 * Generates an id for entities
 * @private
 * @function generateId
 * @returns {string}
 */
export const generateId = shortid.generate;

/**
 * Validates an id of entities
 * @function validateId
 * @param {string} id
 * @returns {boolean}
 */
export const validateId = R.test(/^[a-zA-Z0-9\-_]+$/);

/**
 * Returns object with implementations for casting patches
 * @private
 * @function castImpls
 * @param {PIN_TYPE} typeIn
 * @param {PIN_TYPE} typeOut
 * @returns {object}
 */
// TODO: Add implementations for each type of type conversion
const castImpls = () => ({});

/**
 * Return pins for casting patches
 * @private
 * @function castPins
 * @param {PIN_TYPE} typeIn
 * @param {PIN_TYPE} typeOut
 * @returns {Pin[]}
 */
const castPins = (typeIn, typeOut) => ({
  __in__: { key: '__in__', type: typeIn, direction: CONST.PIN_DIRECTION.INPUT },
  __out__: { key: '__out__', type: typeOut, direction: CONST.PIN_DIRECTION.OUTPUT },
});

/**
 * Returns casting patch
 * @private
 * @function getCastPatch
 * @param {PIN_TYPE} typeIn
 * @param {PIN_TYPE} typeOut
 * @returns {Patch}
 */
export const getCastPatch = (typeIn, typeOut) => ({
  nodes: {}, links: {}, impls: castImpls(typeIn, typeOut), pins: castPins(typeIn, typeOut),
});

/**
 * Returns path for casting patch
 * @private
 * @function getCastPath
 * @param {PIN_TYPE} typeIn
 * @param {PIN_TYPE} typeOut
 * @returns {String}
 */
export const getCastPath = (typeIn, typeOut) => `cast-${typeIn}-to-${typeOut}`;
