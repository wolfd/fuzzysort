/*
WHAT: SublimeText-like Fuzzy Search

USAGE:
  fuzzysort.single('fs', 'Fuzzy Search') // {score: -16}
  fuzzysort.single('test', 'test') // {score: 0}
  fuzzysort.single('doesnt exist', 'target') // null

  fuzzysort.go('mr', ['Monitor.cpp', 'MeshRenderer.cpp'])
  // [{score: -18, target: "MeshRenderer.cpp"}, {score: -6009, target: "Monitor.cpp"}]

  fuzzysort.highlight(fuzzysort.single('fs', 'Fuzzy Search'), '<b>', '</b>')
  // <b>F</b>uzzy <b>S</b>earch
*/

const MAX_SEARCH_STRING_LENGTH_FOR_CACHING = 999;
const MAX_TARGET_STRING_LENGTH_FOR_CACHING = 999;

export interface IFuzzyOptions {
  allowTypo?: boolean;
}

const isObj = (thing: unknown): thing is object => {
  return typeof thing === "object";
};

type PreparedSearch = number[]; // lowercase charCodes

const searchCache: Map<string, PreparedSearch> = new Map();

type PreparedTarget = {
  target: string;
  score: number | null;
  indexes: number[] | null;
  obj: object | null;

  // internal
  _targetLowerCodes: number[];
  _nextBeginningIndexes: number[];
};

const targetCache: Map<string, PreparedTarget> = new Map();

const matchesSimple: number[] = [];

export default class Fuzzy {
  constructor(readonly instanceOptions?: IFuzzyOptions) {}

  public single = (
    search: string | PreparedSearch,
    target: string | PreparedTarget,
    options?: IFuzzyOptions
  ) => {
    if (!search) {
      return null;
    }
    if (!isObj(search)) {
      search = this.getPreparedSearch(search);
    }

    if (!target) {
      return null;
    }
    if (!isObj(target)) {
      target = this.getPreparedTarget(target);
    }

    const allowTypo: boolean =
      (options && options.allowTypo) ||
      (this.instanceOptions && this.instanceOptions.allowTypo) ||
      false;

    const algorithm = allowTypo ? this.algorithm : this.algorithm; // : this.algorithmNoTypo;

    return algorithm(search, target);
  };

  private algorithm = (
    preparedSearch: PreparedSearch,
    preparedTarget: PreparedTarget
  ) => {
    if (!preparedTarget) {
      return;
    }
    const targetLowerCodes = preparedTarget._targetLowerCodes;
    const searchLen = preparedSearch.length;
    const targetLen = targetLowerCodes.length;

    let searchIndex = 0; // where we at
    let targetIndex = 0; // where "you" at
    let typoSimpleIndex = 0;
    let matchesSimpleLen = 0;

    if (targetLen === 0) {
      return;
    }
    let searchLowerCode = preparedSearch[0];
    // very basic fuzzy match; to remove non-matching targets ASAP!
    // walk through target. find sequential matches.
    // if all chars aren't found then exit
    while (true) {
      const isMatch = searchLowerCode === targetLowerCodes[targetIndex];
      if (isMatch) {
        matchesSimple[matchesSimpleLen++] = targetIndex;
        ++searchIndex;
        ////////////////
      }
    }
  };

  private getPreparedTarget = (target: string): PreparedTarget => {
    if (target.length > MAX_TARGET_STRING_LENGTH_FOR_CACHING) {
      return this.prepareTarget(target); // don't cache huge targets
    }
    const cachedTarget = targetCache.get(target);
    if (cachedTarget) {
      return cachedTarget;
    }
    const preparedTarget = this.prepareTarget(target);
    targetCache.set(target, preparedTarget);
    return preparedTarget;
  };

  private getPreparedSearch = (search: string): PreparedSearch => {
    if (search.length > MAX_SEARCH_STRING_LENGTH_FOR_CACHING) {
      return this.prepareSearch(search);
    }
    const cachedSearch = searchCache.get(search);
    if (cachedSearch) {
      return cachedSearch;
    }
    const preparedSearch = this.prepareSearch(search);
    searchCache.set(search, preparedSearch);
    return preparedSearch;
  };

  private prepareSearch = (search: string): PreparedSearch => {
    return this.prepareLowerCodes(search);
  };

  private prepareTarget = (target: string): PreparedTarget => {
    return {
      target,
      score: null,
      indexes: null,
      obj: null,
      _targetLowerCodes: this.prepareLowerCodes(target),
      _nextBeginningIndexes: this.prepareNextBeginningIndexes(target)
    };
  };

  private prepareLowerCodes = (search: string): number[] => {
    const searchLen = search.length;
    const lowerCodes: number[] = fillNumberArray(searchLen);

    const lower = search.toLowerCase();
    for (let i = 0; i < searchLen; i++) {
      lowerCodes[i] = lower.charCodeAt(i);
    }
    return lowerCodes;
  };

  private prepareBeginningIndexes = (target: string): number[] => {
    const targetLen = target.length;
    const beginningIndexes = [];
    let beginningIndexesLen = 0;
    let wasUpper = false;
    let wasAlphanum = false;
    for (let i = 0; i < targetLen; i++) {
      const targetCode = target.charCodeAt(i);
      const isUpper = targetCode >= 65 && targetCode <= 90;
      const isAlphanum =
        isUpper ||
        (targetCode >= 97 && targetCode <= 122) ||
        (targetCode >= 48 && targetCode <= 57);
      const isBeginning = (isUpper && !wasUpper) || !wasAlphanum || !isAlphanum;
      wasUpper = isUpper;
      wasAlphanum = isAlphanum;
      if (isBeginning) {
        beginningIndexes[beginningIndexesLen++] = i;
      }
    }
    return beginningIndexes;
  };

  private prepareNextBeginningIndexes = (target: string): number[] => {
    const targetLen = target.length;
    const beginningIndexes = this.prepareBeginningIndexes(target);
    const nextBeginningIndexes = fillNumberArray(targetLen);
    let lastIsBeginning = beginningIndexes[0];
    let lastIsBeginningI = 0;
    for (let i = 0; i < targetLen; i++) {
      if (lastIsBeginning > i) {
        nextBeginningIndexes[i] = lastIsBeginning;
      } else {
        lastIsBeginning = beginningIndexes[++lastIsBeginningI];
        nextBeginningIndexes[i] =
          lastIsBeginning === undefined ? targetLen : lastIsBeginning;
      }
    }
    return nextBeginningIndexes;
  };
}

const fillNumberArray = (size: number): number[] => {
  const array: number[] = [];
  // speedy method of filling an array
  array.length = size;
  array.fill(0);
  return array;
};
