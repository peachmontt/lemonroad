import { json, unauthorized, withMethods } from '../_lib/http';
import { settlePreviousDayPool } from '../_lib/settle-day-pool';

export default withMethods({
  GET: async (req, res) => {
    const secret = req.headers.authorization?.replace('Bearer ', '');
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return unauthorized(res, 'Invalid cron secret');
    }

    const result = await settlePreviousDayPool();
    if (result.alreadySettled) {
      return json(res, { message: 'Already finalized', ...result });
    }

    json(res, { message: 'Pool finalized — winners can claim', ...result });
  },
});
