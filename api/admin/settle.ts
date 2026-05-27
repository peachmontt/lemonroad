import { prisma } from '../_lib/db';
import { json, unauthorized, withMethods, badRequest, parseJsonBody } from '../_lib/http';
import { isAdminAuthorized } from '../_lib/session';
import { settleDayPool } from '../_lib/settle-day-pool';

export default withMethods({
  POST: async (req, res) => {
    if (!isAdminAuthorized(req)) return unauthorized(res);

    const body = parseJsonBody<{ day?: string }>(req);
    if (!body.day || !/^\d{4}-\d{2}-\d{2}$/.test(body.day)) {
      return badRequest(res, 'day (YYYY-MM-DD game day) required');
    }

    const result = await settleDayPool(body.day);
    if (result.alreadySettled) {
      return json(res, { message: 'Already settled', ...result });
    }

    json(res, result);
  },
});
