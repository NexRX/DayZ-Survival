class ZHordeLogger
{
	static const string ZH_LOG_ROOT = "$profile:ZombieHorde";
	static const string ZH_LOG_FILE = "$profile:ZombieHorde\\ZombieHorde.log";

	static void EnsureDirectory()
	{
		if (!FileExist(ZH_LOG_ROOT))
		{
			MakeDirectory(ZH_LOG_ROOT);
		}
	}

	static string Timestamp()
	{
		int year;
		int month;
		int day;
		int hour;
		int minute;
		int second;

		GetYearMonthDay(year, month, day);
		GetHourMinuteSecond(hour, minute, second);

		return year.ToStringLen(4) + "-" + month.ToStringLen(2) + "-" + day.ToStringLen(2) + " " + hour.ToStringLen(2) + ":" + minute.ToStringLen(2) + ":" + second.ToStringLen(2);
	}

	static void Log(string message)
	{
		EnsureDirectory();

		FileHandle file = OpenFile(ZH_LOG_FILE, FileMode.APPEND);
		if (file != 0)
		{
			FPrintln(file, "[" + Timestamp() + "] " + message);
			CloseFile(file);
		}

		Print("[ZombieHorde] " + message);
	}
}
