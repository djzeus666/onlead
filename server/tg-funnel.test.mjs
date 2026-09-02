import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceFunnel, parseButtons, sectionMessage } from './tg-funnel.mjs';

const funnel = {
  product: 'Гайд',
  price: '990 ₽',
  sections: [
    { title: 'Старт', text: 'Здравствуйте', buttons: 'Каталог, В начало' },
    { title: 'Каталог', text: 'Оффер внутри', buttons: 'Купить' },
    { title: 'Оплата', text: 'Пришлите чек', buttons: 'Я оплатил' },
  ],
};

test('parseButtons splits comma lists', () => {
  assert.deepEqual(parseButtons('Купить, Задать вопрос'), ['Купить', 'Задать вопрос']);
});

test('/start always returns first section', () => {
  const r = advanceFunnel(funnel, 2, '/start');
  assert.equal(r.step, 0);
  assert.equal(r.section.title, 'Старт');
  assert.equal(r.done, false);
});

test('button matching section title jumps there', () => {
  const r = advanceFunnel(funnel, 0, 'Каталог');
  assert.equal(r.step, 1);
  assert.equal(r.section.title, 'Каталог');
});

test('unknown text advances to next section', () => {
  const mid = advanceFunnel(funnel, 1, 'Купить');
  assert.equal(mid.step, 2);
  const plain = advanceFunnel(funnel, 2, 'просто текст');
  assert.equal(plain.done, true);
});

test('payment button waits for receipt instead of finishing', () => {
  const end = advanceFunnel(funnel, 2, 'Я оплатил');
  assert.equal(end.done, false);
  assert.equal(end.awaitingReceipt, true);
  assert.equal(end.step, 2);
});

test('sectionMessage includes title and body', () => {
  const text = sectionMessage(funnel.sections[1], funnel);
  assert.match(text, /Каталог/);
  assert.match(text, /Оффер/);
});
