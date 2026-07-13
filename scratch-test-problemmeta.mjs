import { fetchProblemMeta } from './app/lib/problemMeta/resolve.ts';

(async () => {
  try {
    const lc = await fetchProblemMeta('https://leetcode.com/problems/two-sum/');
    console.log('LEETCODE:', JSON.stringify(lc));
  } catch (e) { console.error('LEETCODE FAILED:', e.message); }

  try {
    const cf = await fetchProblemMeta('https://codeforces.com/problemset/problem/4/A');
    console.log('CODEFORCES:', JSON.stringify(cf));
  } catch (e) { console.error('CODEFORCES FAILED:', e.message); }

  try {
    const atc = await fetchProblemMeta('https://atcoder.jp/contests/abc300/tasks/abc300_a');
    console.log('ATCODER:', JSON.stringify(atc));
  } catch (e) { console.error('ATCODER FAILED:', e.message); }
})();
