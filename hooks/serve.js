'use strict';
import fs, { constants } from "node:fs/promises";
import path, { resolve } from "node:path";
import { tmpdir } from "node:os";
import {Server} from "node:http";
import { promisify } from "node:util";

import express from "express";
import { v2 as webdav } from "webdav-server";
import request from "supertest";
import assert from "node:assert/strict";




export const mochaHooks = {
  /**
   * Data files directory
   */
  dir: "",
  /**
   * Bound port
   */
  port: 0,

  explorer:"",
  story:"",

  /** @type {request.Agent|null} */
  request: null,
  async beforeAll(){
    const distDir = resolve(process.cwd(), process.env["DIST"] ?? "");
    const devBuild = JSON.parse(process.env["DEV_BUILD"] || "0");
    const distFile = `voyager-explorer${devBuild?"-dev":""}.html`;
    await assert.doesNotReject(fs.access(path.join(distDir, distFile), constants.R_OK), `expect ${ distFile } to exist in ${distDir}`);

    this.reset = async ()=>{
      if(this.server) await promisify(this.server.close.bind(this.server))();
      if(this.dir) await fs.rm(this.dir, {force: true, recursive: true});
      this.dir = await fs.mkdtemp(path.join(tmpdir(), "voyager-e2e-tests"));
      const app = express();
      app.use("/", express.static(distDir));
      const webDAVServer = new webdav.WebDAVServer();
      await new Promise((resolve, reject)=>{
        webDAVServer.setFileSystem("/", new webdav.PhysicalFileSystem(this.dir), success => {
            if (!success) {
                return reject(new Error(`failed to mount WebDAV file system at '${this.dir}'`));
            }
            app.use(webdav.extensions.express("/", webDAVServer));
            resolve();
        });
      });
      this.server = new Server(app);
      await promisify(this.server.listen.bind(this.server))(0);
      this.port = this.server.address().port;
      this.explorer =`http://localhost:${this.port}/voyager-explorer${devBuild?"-dev":""}.html`;
      this.story = `http://localhost:${this.port}/voyager-story${devBuild?"-dev":""}.html`;
      this.request = request.agent(app);
    }

  },

  async afterAll(){
    if(this.server)await promisify(this.server.close.bind(this.server))();
    if(this.dir) await fs.rm(this.dir, {force: true, recursive: true});
  }
}