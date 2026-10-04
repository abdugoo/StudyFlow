import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, ApiError } from '../src/api.ts';
let token = 'test-token';
globalThis.sessionStorage = { getItem: () => token };
globalThis.window = new EventTarget();

test('JSON writes include bearer token and preserve payload', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/courses/');
    assert.equal(options.headers.get('Authorization'), 'Bearer test-token');
    assert.equal(options.headers.get('Content-Type'), 'application/json');
    assert.deepEqual(JSON.parse(options.body), {title:'Python',description:'Basics'});
    return Response.json({id:1});
  };
  assert.deepEqual(await api('/courses/', {method:'POST',body:JSON.stringify({title:'Python',description:'Basics'})}),{id:1});
});
test('OAuth login keeps form encoding and does not expire existing session on bad credentials', async () => {
  let expired = false;
  window.addEventListener('session-expired', () => expired=true, {once:true});
  globalThis.fetch = async (_, options) => {
    assert.ok(options.body instanceof URLSearchParams);
    assert.equal(options.headers.get('Content-Type'),null);
    return Response.json({detail:'Incorrect username or password'},{status:401});
  };
  await assert.rejects(api('/auth/login',{method:'POST',body:new URLSearchParams({username:'student',password:'test'})}), /Incorrect username/);
  assert.equal(expired,false);
});
test('protected 401 expires session', async () => {
  let expired = false;
  window.addEventListener('session-expired', () => expired=true, {once:true});
  globalThis.fetch = async () => Response.json({detail:'Expired'},{status:401});
  await assert.rejects(api('/me/'), ApiError);
  assert.equal(expired,true);
});
test('204 deletes require no JSON response', async () => {
  globalThis.fetch = async () => new Response(null,{status:204});
  assert.equal(await api('/me/courses/1',{method:'DELETE'}),undefined);
});
test('FastAPI validation errors become readable messages', async () => {
  globalThis.fetch = async () => Response.json({detail:[{msg:'Field required'},{msg:'Invalid role'}]},{status:422});
  await assert.rejects(api('/auth/register'), /Field required. Invalid role/);
});
test('network failures provide recoverable error', async () => {
  globalThis.fetch = async () => {throw new TypeError('Failed to fetch');};
  await assert.rejects(api('/courses/'), e => e.status===0 && e.message.includes('backend'));
});
