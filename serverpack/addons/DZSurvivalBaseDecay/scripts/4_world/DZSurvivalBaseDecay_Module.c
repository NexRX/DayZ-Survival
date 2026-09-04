// DZSurvivalBaseDecay_Module.c
//
// Time-based abandonment cleanup for this server's vanilla-style bases
// (fence kits + tents secured with a Code-Lock CodeLock item) - see
// TODO.md's "Base decay/raiding" item for the design background. Neither
// vanilla DayZ nor Code-Lock itself has any concept of decay: a locked base
// persists forever with no upkeep unless something physically destroys it.
// This addon adds a real 30-day "if nobody has touched this lock in 30
// days, force-unlock it and drop it on the ground" cleanup pass, without
// touching Code-Lock's own save format (see below) or DayZ-Expansion's
// separate Territory Flag system (this server doesn't use it - confirmed by
// checking every installed base-building mod, see TODO.md).
//
// --- Why a separate JSON file instead of extending CodeLock's own state ---
// CodeLock (server/@Code-Lock/addons/codelock.pbo, scripts/4_world/Entities/
// CodeLock.c) has no existing "last activity" timestamp field at all, and
// its OnStoreSave/OnStoreLoad are append-only binary streams owned entirely
// by that third-party mod. Grafting a new field onto that stream would be
// fragile against any future Code-Lock update (a changed field order or a
// version bump could silently corrupt saves for a mod we don't control).
// Instead, activity is tracked in this addon's OWN small JSON file, keyed by
// each lock's rounded-to-the-meter world position (stable across restarts
// once a lock is attached to a fence/tent, since neither moves) - the exact
// same pattern DZSurvivalTraderRestock already uses for its own state
// (TraderRestock.json), just a different file under the same directory.
//
// --- Why hook the Action classes, not CodeLock's own open methods ---
// The obvious "hook whatever opens the gate" approach doesn't work: the
// most common real activity (an owner/guest opening a gate they already
// know the code for) goes through ActionInteractLockOnFence.OnStartServer /
// ActionInteractLockOnTent.OnStartServer, which call fence.OpenFence() /
// tent.ToggleAnimation("entrancec") DIRECTLY - the CodeLock object itself is
// only read (GetLockState/IsOwner/IsGuest), never mutated, on that path. So
// hooking only CodeLock's own methods would miss the single most common
// "this base is still in use" signal. Worse, hooking Fence.OpenFence()/the
// tent equivalent directly was tried and rejected too: vanilla's own
// Fence.AfterStoreLoad() calls OpenFence() again on every server restart if
// the gate was left open last session - hooking that would falsely record
// "activity" for every open-gate base on every single restart, defeating
// the whole point. So activity is recorded at the Action-class level
// (duplicating the same isOwner||isGuest check the vanilla action body
// already does, since we can't rely on a side effect through a call we
// don't control) for the "already knows the code" path, PLUS by hooking
// CodeLock.LockServer() (initial claim / passcode change) and
// CodeLock.ServerSetOwner() (a stranger successfully enters the passcode
// and becomes the owner/a guest - see CodeLockServerRPC.EnterCode(), which
// is itself private and can't be hooked directly, but always calls
// ServerSetOwner() right before opening either way) - between these three
// hook points, every real way a legitimate user interacts with a lock is
// covered.
//
// --- Debug/status ---
// Same observability precedent as DZSurvivalTraderRestock: every daily tick
// logs a one-line heartbeat via GetGame().AdminLog() (checked/decayed
// counts) regardless of outcome, plus one line per actual decay event - all
// readable live in-game via Community-Online-Tools' admin log viewer. A
// matching "/basedecay status now" COT command exists for on-demand
// checks/testing - see DZSurvivalBaseDecay_COTCommand.c.
class DZSurvivalBaseDecayState
{
	// Key: PositionKey(lock.GetPosition()) (see DZSurvivalBaseDecay.
	// PositionKey() below). Value: real unix seconds of the last recorded
	// activity for that lock. A lock with no entry yet is treated as
	// "first seen now" (see GetLastActivityOrNow()) rather than already
	// overdue - so deploying this addon doesn't instantly decay every
	// pre-existing base the moment it ships.
	ref map<string, int> LastActivityUnix = new map<string, int>();
};

class DZSurvivalBaseDecay
{
	// Shares the same directory as DZSurvivalTraderRestock's own state file,
	// just a different filename within it.
	protected static const string STATE_DIR = "$profile:DZSurvivalServerPack";
	protected static const string STATE_PATH = STATE_DIR + "\\BaseDecay.json";

	// A locked base that's gone untouched this long is considered
	// abandoned. Per the project owner's explicit request.
	protected static const int DECAY_DAYS = 30;
	protected static const int DECAY_SECONDS = DECAY_DAYS * 86400;

	// Daily granularity is plenty of precision for a 30-day window - no
	// need for hourly checks here (unlike the trader restock ticker, which
	// has cooldowns as short as a few hours).
	protected static const int TICK_INTERVAL_MS = 86400000; // 24h
	protected static const int FIRST_TICK_DELAY_MS = 30000; // let mission settle first

	protected static ref DZSurvivalBaseDecayState s_State;

	// Rebuilt fresh every boot from every currently-spawned CodeLock's own
	// EEInit()/EEDelete() lifecycle hooks (see DZSurvivalBaseDecay_CodeLock.
	// c) - NOT persisted itself, only the activity timestamps are.
	protected static ref array<CodeLock> s_LiveLocks = new array<CodeLock>();

	static void Init()
	{
		LoadState();
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(Tick, FIRST_TICK_DELAY_MS, false);
	}

	protected static void LoadState()
	{
		s_State = new DZSurvivalBaseDecayState();
		if (FileExist(STATE_PATH))
			JsonFileLoader<DZSurvivalBaseDecayState>.JsonLoadFile(STATE_PATH, s_State);
	}

	protected static void SaveState()
	{
		// MakeDirectory is idempotent - safe to call every save, and
		// required the first time (JsonSaveFile silently no-ops if the
		// parent folder doesn't exist yet - see DZSurvivalTraderRestock's
		// own SaveState() for the same fix, confirmed live before).
		MakeDirectory(STATE_DIR);
		JsonFileLoader<DZSurvivalBaseDecayState>.JsonSaveFile(STATE_PATH, s_State);
	}

	// Same Howard-Hinnant days-from-civil algorithm as DZSurvivalTraderRestock_
	// Module.c's own NowUnix() - deliberately duplicated rather than shared
	// across addons (this project's own established convention: each
	// serverpack addon is a standalone PBO build unit with no compile-time
	// dependency on another addon's scripts).
	protected static int NowUnix()
	{
		int year, month, day, hour, minute, second;
		GetYearMonthDayUTC(year, month, day);
		GetHourMinuteSecondUTC(hour, minute, second);

		int y = year;
		if (month <= 2)
			y = year - 1;
		int era = y / 400;
		int yoe = y - era * 400;
		int mAdj = month + 9;
		if (month > 2)
			mAdj = month - 3;
		int doy = (153 * mAdj + 2) / 5 + day - 1;
		int doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
		int days = era * 146097 + doe - 719468;

		return days * 86400 + hour * 3600 + minute * 60 + second;
	}

	// Rounds to the nearest whole meter per axis - stable across restarts
	// for any lock actually attached to a fence/tent (neither moves once
	// placed), while tolerating the tiny float jitter that can otherwise
	// make the exact same position serialize slightly differently.
	static string PositionKey(vector pos)
	{
		int x = Math.Round(pos[0]);
		int y = Math.Round(pos[1]);
		int z = Math.Round(pos[2]);
		return string.Format("%1_%2_%3", x, y, z);
	}

	protected static int GetLastActivityOrNow(string key)
	{
		int existing;
		if (s_State.LastActivityUnix.Find(key, existing))
			return existing;

		int now = NowUnix();
		s_State.LastActivityUnix.Set(key, now);
		return now;
	}

	// Called from every hook point that represents real, legitimate use of
	// a lock (see this file's header comment for the full list of hook
	// points and why each one was chosen). All existing call sites are
	// engine-guaranteed server-only already (*Server()-suffixed methods),
	// but guarded here too for defense-in-depth alongside RegisterLock/
	// UnregisterLock above.
	static void RecordActivity(CodeLock lock)
	{
		if (!lock || !GetGame().IsServer())
			return;

		s_State.LastActivityUnix.Set(PositionKey(lock.GetPosition()), NowUnix());
	}

	// EEInit()/EEDelete() (see DZSurvivalBaseDecay_CodeLock.c) are generic
	// entity lifecycle callbacks that fire on every machine a CodeLock is
	// visible to (including remote clients' own local proxy of it), unlike
	// the *Server()-suffixed methods elsewhere in this addon which the
	// engine itself only ever invokes on the authoritative server. The
	// IsServer() guard here is what actually keeps this addon's runtime
	// state/behavior server-only now that its scripts live in the shared
	// client+server pack (see this addon's own move history/comments in
	// paths.ts) - the class itself must stay defined identically on both
	// sides so its COT module/permission registration (see
	// DZSurvivalBaseDecay_COTCommand.c) matches between client and server.
	static void RegisterLock(CodeLock lock)
	{
		if (!lock || !GetGame().IsServer())
			return;
		if (s_LiveLocks.Find(lock) == -1)
			s_LiveLocks.Insert(lock);
	}

	static void UnregisterLock(CodeLock lock)
	{
		if (!GetGame().IsServer())
			return;
		int idx = s_LiveLocks.Find(lock);
		if (idx > -1)
			s_LiveLocks.Remove(idx);
	}

	static void Tick()
	{
		TickInternal();
		GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(Tick, TICK_INTERVAL_MS, false);
	}

	// Manual/testing entry point (COT "/basedecay now") - runs the exact
	// same pass as the real daily tick, on demand, and returns the decayed
	// count so the caller can echo a result back to the admin who ran it.
	static int ForceTick()
	{
		return TickInternal();
	}

	protected static int TickInternal()
	{
		int now = NowUnix();
		int checkedCount = 0;
		int decayedCount = 0;

		for (int i = s_LiveLocks.Count() - 1; i >= 0; i--)
		{
			CodeLock lock = s_LiveLocks.Get(i);
			if (!lock)
			{
				s_LiveLocks.Remove(i);
				continue;
			}

			if (!lock.GetLockState())
				continue; // not currently locked - nothing to decay

			checkedCount++;

			string key = PositionKey(lock.GetPosition());
			int idleSeconds = now - GetLastActivityOrNow(key);
			if (idleSeconds < DECAY_SECONDS)
				continue;

			EntityAI parent = EntityAI.Cast(lock.GetHierarchyParent());
			if (!parent)
				continue;

			// The exact same "force-unlock with no player" pattern Code-
			// Lock's own Fence.c uses internally (OnPartDestroyedServer
			// calls codelock.NewUnlockServer(null, this) when a connected
			// fence part is destroyed with no player attribution) - a mod-
			// author-sanctioned way to unlock+drop a lock with nobody
			// holding it. This makes the base freely enterable/raidable,
			// which is the actual "decay" outcome wanted here, using the
			// mod's own built-in mechanism rather than deleting or
			// damaging any objects ourselves.
			lock.NewUnlockServer(null, parent);

			s_State.LastActivityUnix.Remove(key);
			decayedCount++;

			GetGame().AdminLog(string.Format("[BaseDecay] Decayed an abandoned lock at %1 (idle %2 day(s), parent %3).", lock.GetPosition().ToString(false), idleSeconds / 86400, parent.GetType()));
		}

		SaveState();

		GetGame().AdminLog(string.Format("[BaseDecay] Tick - checked %1 locked base(s), decayed %2.", checkedCount, decayedCount));

		return decayedCount;
	}

	// Human-readable summary for the COT "/basedecay status" command.
	static string BuildStatusText()
	{
		int now = NowUnix();
		int lockedCount = 0;
		int closestDaysLeft = -1;

		foreach (CodeLock lock : s_LiveLocks)
		{
			if (!lock || !lock.GetLockState())
				continue;

			lockedCount++;

			int idleSeconds = now - GetLastActivityOrNow(PositionKey(lock.GetPosition()));
			int daysLeft = (DECAY_SECONDS - idleSeconds) / 86400;
			if (daysLeft < 0)
				daysLeft = 0;

			if (closestDaysLeft == -1 || daysLeft < closestDaysLeft)
				closestDaysLeft = daysLeft;
		}

		if (lockedCount == 0)
			return string.Format("No locked bases tracked. Decay threshold: %1 day(s) of inactivity.", DECAY_DAYS);

		return string.Format("%1 locked base(s) tracked. Decay threshold: %2 day(s) of inactivity. Closest to decay: %3 day(s) left.", lockedCount, DECAY_DAYS, closestDaysLeft);
	}
};
