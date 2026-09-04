/*
 * Общие функции для работы с деньгами — валюта евро (€).
 * Все цены в data/menu.json хранятся как евро с копейками (например 4.8).
 * Суммы всегда считаются в центах (целые числа), чтобы не ловить
 * ошибки округления вида 4.8 * 3 = 14.399999999997.
 */
function toCents(amountEur){
  return Math.round(amountEur * 100);
}
function formatEUR(amountEur){
  return amountEur.toFixed(2).replace('.', ',') + ' €';
}
function formatCents(cents){
  return formatEUR(cents / 100);
}
