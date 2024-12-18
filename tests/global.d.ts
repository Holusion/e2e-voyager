
import * as chai from "chai";
import { Page } from "puppeteer";
import { Agent } from "supertest";

// From hooks/chai.js
declare global{
  const expect = chai.expect;
  export namespace Chai {        
    
    
    interface PromisedAssertion extends PromiseLike<any> {}

    interface Assertion extends LanguageChains, NumericComparison, TypeComparison {
      show(name: string, fuzz?: number): PromisedAssertion;
      rect(bounds?:{x?: number, y?: number, width?: number, height?: number}):Assertion;
      selector(selector: string):Assertion;
    }
  }
}



declare module 'mocha' {
  export interface Context {
    //From hooks/serve.js
    reset: ()=>Promise<void>;
    href: string;
    request: Agent;
    log: string[];
    //From hooks/browser.js
    newPage: (withContext?:boolean)=>Promise<Page>;
  }
}

