import { fetchFeed, fetchPortfolio, fetchTopTrades, setHold } from '../data/api';
import { feedForTab, portfolio, topTrades } from '../data/mock';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  setHold(false);
  jest.useRealTimers();
});

describe('mock api', () => {
  it('answers with the mock data after the latency', async () => {
    const done = jest.fn();
    fetchPortfolio(600).then(done);
    await jest.advanceTimersByTimeAsync(599);
    expect(done).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalledWith(portfolio);
  });

  it('serves the top trades and each tab its own feed', async () => {
    const trades = fetchTopTrades(0);
    const rising = fetchFeed('rising', 0);
    await jest.advanceTimersByTimeAsync(0);
    await expect(trades).resolves.toEqual(topTrades);
    await expect(rising).resolves.toEqual(feedForTab('rising'));
  });

  it('parks answers while held and delivers them when the hold ends', async () => {
    setHold(true);
    const done = jest.fn();
    fetchPortfolio(100).then(done);
    await jest.advanceTimersByTimeAsync(5000);
    expect(done).not.toHaveBeenCalled();
    setHold(false);
    await jest.advanceTimersByTimeAsync(0);
    expect(done).toHaveBeenCalledWith(portfolio);
  });
});
