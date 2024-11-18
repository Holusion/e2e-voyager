

describe("Setup tests", function(){

  describe("webDAV server", function(){
    this.beforeAll(async function(){
      await this.reset();
    });
  
    it("serve static files", async function(){
      let res = await this.request.get("/voyager-explorer.html")
      .expect(200);
      expect(res.text).to.match(/<voyager-explorer>/);
    });
    it("uploads content", async function(){
      await this.request.get("/scene.svx.json")
      .expect(404);
      await this.request.put("/scene.svx.json")
      .expect(201);
      await this.request.get("/scene.svx.json")
      .expect(200);
    });
  });

  describe("Web Browser", function(){
    /**@type {import("puppeteer").Page} */
    let page;
    this.beforeAll(async function(){
      await this.reset();
      page = await this.newPage();
    });

    it("opens a page", async function(){
      await page.goto(`${this.explorer}`);
    });

  })
});