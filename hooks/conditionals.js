'use strict';



const with_eCorpus = !!JSON.parse(process.env["ECORPUS"] || "1");


export const mochaHooks = {
  async beforeEach(){
    let title = this.currentTest.title;
    if(!with_eCorpus && /\[eCorpus\]/i.test(title)){
      this.skip();
    }
  },

}