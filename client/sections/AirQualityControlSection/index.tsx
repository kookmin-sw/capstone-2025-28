"use client"
import { Brush, CloudSunIcon, SmileIcon, SunIcon } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AreaChart, CartesianGrid, XAxis, Area } from "recharts";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useSocketStore } from "@/stores/socketStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const parseTimeStringToMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const formatTimeToHHMM = (minutes: number): string => {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
};

export const AirQualityControlSection = (): JSX.Element => {
  // const [isPurifierOn, setIsPurifierOn] = useState(false);
  // const [isDiffuserOn, setIsDiffuserOn] = useState(false);
  const [showCards, setShowCards] = useState(true);
  const [isLiveViewOpen, setIsLiveViewOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<string | null>(null);
  
  const {
    air_quality_score,
    air_quality,
    tvoc,
    eco2,
    temp,
    humidity,
    mq135_co2_ppm,
    mq7_co_ppm,
    mq4_methane_ppm,
    isPurifierOn,
    isDiffuserOn,
    purifierSpeed,
    purifierAutoOn,
    purifierAutoOff,
    purifierMode,
    diffuserSpeed,
    diffuserPeriod,
    diffuserType,
    diffuserMode,
    motionDetectedTime,
    aiRecommendation,
    webcamImage,
    pm25_filtered,
    fetchWebcamImage,
    sendControlSignal,
    registerDashboard,
    currentDeviceKey
  } = useSocketStore();
  const [chartHistory, setChartHistory] = useState<Record<string, any[]>>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const chartConfig = {
    air_quality_score: {
      label: "Air Quality",
      color: "hsl(var(--chart-1))",
    },
    pm25_filtered: {
      label: "미세먼지",
      color: "hsl(var(--chart-2))",
    },
    tvoc: {
      label: "VOC",
      color: "hsl(var(--chart-3))",
    },
    eco2: {
      label: "CO₂",
      color: "hsl(var(--chart-4))",
    },
    mq135_co2_ppm: {
      label: "MQ135 CO₂",
      color: "hsl(var(--chart-5))",
    },
    mq7_co_ppm: {
      label: "MQ7 CO",
      color: "hsl(var(--chart-6))",
    },
    mq4_methane_ppm: {
      label: "Methane",
      color: "hsl(var(--chart-7))",
    },
  } satisfies ChartConfig;
  const [currentMetric, setCurrentMetric] = useState<keyof typeof chartConfig>("air_quality_score");
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return `${now.getHours()}시 ${now.getMinutes()}분`;
  });
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(`${now.getHours()}시 ${now.getMinutes()}분`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const time = new Date().toLocaleTimeString();
      const newData = {
        time,
        air_quality_score,
        pm25_filtered,
        tvoc,
        eco2,
        mq135_co2_ppm,
        mq7_co_ppm,
        mq4_methane_ppm,
      };

      setChartData((prev) => {
        const updated = [...prev, newData];
        if (updated.length > 60) updated.shift();

        setChartHistory((prevHistory) => {
          const deviceKey = currentDeviceKey;
          const prevDeviceData = prevHistory[deviceKey] || [];
          const newDeviceData = [...prevDeviceData, newData];
          if (newDeviceData.length > 60) newDeviceData.shift();
          return {
            ...prevHistory,
            [deviceKey]: newDeviceData,
          };
        });

        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [air_quality_score, pm25_filtered, tvoc, eco2, mq135_co2_ppm, mq7_co_ppm, mq4_methane_ppm, currentDeviceKey]);
  
  useEffect(() => {
    if (isLiveViewOpen) {
      fetchWebcamImage();
    }
  }, [isLiveViewOpen]);

  // Data for the months in the chart
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  // Helper functions
  const getSpeedLabel = (speed: number) => {
    return speed === 1 ? "Low" : speed === 2 ? "Medium" : "High";
  };

  const getTypeLabel = (type: number) => {
    return type === 1 ? "A type" : type === 2 ? "B type" : "C type";
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };
  
  const cycleOption = (current: number, options: number[]): number => {
    const currentIndex = options.indexOf(current);
    return options[(currentIndex + 1) % options.length];
  };

  // Data for Air Purifier settings
  const purifierSettings = [
    { label: "Mode", value: purifierMode === 0 ? "수동" : "AI MODE", key: "purifierMode" },
    { label: "Auto turn on", value: formatTime(purifierAutoOn), key: "purifierAutoOn" },
    { label: "Auto turn off", value: formatTime(purifierAutoOff), key: "purifierAutoOff" },
    { label: "Speed", value: getSpeedLabel(purifierSpeed), key: "purifierSpeed" },
  ];

  // Data for Air Diffuser settings
  const diffuserSettings = [
    { label: "Mode", value: diffuserMode === 0 ? "수동" : "AI MODE", key: "diffuserMode" },
    { label: "Fragrance Type", value: getTypeLabel(diffuserType), key: "diffuserType" },
    { label: "Period", value: `${Math.floor(diffuserPeriod / 60)} Min`, key: "diffuserPeriod" },
    { label: "Speed", value: getSpeedLabel(diffuserSpeed), key: "diffuserSpeed" },
  ];

  const metrics = Object.keys(chartConfig) as (keyof typeof chartConfig)[];
  const currentIndex = metrics.indexOf(currentMetric);

  const handlePrevMetric = () => {
    setCurrentMetric(metrics[(currentIndex - 1 + metrics.length) % metrics.length]);
  };

  const handleNextMetric = () => {
    setCurrentMetric(metrics[(currentIndex + 1) % metrics.length]);
  };

  useEffect(() => {
    if (chartHistory[currentDeviceKey]) {
      setChartData(chartHistory[currentDeviceKey]);
    } else {
      setChartData([]);
    }
  }, [currentDeviceKey]);

  return (
    <>
      <div className="w-full flex justify-center mb-2">
        <button
          onClick={() => setShowCards((prev) => !prev)}
          className="text-white text-xs bg-slate-700 rounded-full px-2 py-1 hover:bg-slate-600 transition"
        >
          {showCards ? "↓" : "↑"}
        </button>
      </div>
      <div
        className={`transition-all duration-500 overflow-hidden ${
          showCards ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
      <section className="flex flex-wrap items-end justify-between gap-4 w-full mt-8">
      {/* Digital Twin Status Card */}
      <Card className="w-full lg:w-[calc(25%-12px)] p-6 bg-grey-50 rounded-2xl overflow-hidden -rotate-180 shadow-[2px_4px_24px_#ffffff1f,inset_0px_1px_1px_#ffffff40,inset_0px_1px_1px_#ffffff1a] backdrop-blur-[6px]">
        <CardContent className="p-0 flex flex-col gap-6">
          <div className="items-center justify-end px-[3px] py-0 flex w-full">
            <div className="w-fit mt-[-1.00px] font-light text-neutral-75 text-sm rotate-180 [font-family:'Lato',Helvetica] tracking-[0] leading-normal">
              🚪 지금 환기하면 좋습니다! <br />
              2시간 후 미세먼지 증가 예상 됩니다.
            </div>
          </div>

          <div className="relative w-full h-[72px]">
            <div className="flex w-full items-center justify-end gap-3 absolute top-3.5 left-0">
              <SunIcon className="w-6 h-6 ml-[-3.67px] rotate-180" />
              <div className="relative w-full rotate-180 [font-family:'Lato',Helvetica] font-semibold text-neutral-100 text-lg tracking-[0] leading-normal overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:1] [-webkit-box-orient:vertical]">
              실내&nbsp;&nbsp;:&nbsp;&nbsp;{temp}°C , {humidity}%
              </div>
            </div>

            <div className="flex w-full items-center justify-end gap-3 absolute top-12 left-0">
              <CloudSunIcon className="w-6 h-6 ml-[-3.67px] rotate-180" />
              <div className="relative w-full rotate-180 [font-family:'Lato',Helvetica] font-semibold text-neutral-100 text-lg tracking-[0] leading-normal overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:1] [-webkit-box-orient:vertical]">
                실외&nbsp;&nbsp;:&nbsp;&nbsp;13°C , 54% , 34CAI
              </div>
            </div>
          </div>

          <div className="relative w-full h-[161px]">
            <div className="flex flex-col w-full h-[101px] items-center justify-center gap-[var(--spacing-space-y-2-5)] absolute top-0 left-0 rotate-180">
              <ChartContainer config={chartConfig} className="relative w-full h-[76px]">
                <AreaChart
                  data={chartData}
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: "white" }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Area
                    dataKey={currentMetric}
                    type="natural"
                    fill="white"
                    fillOpacity={0.15}
                    stroke="white"
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            <div className="flex w-full items-center justify-center gap-7 absolute top-[125px] left-0">
              <div className="inline-flex items-start justify-end gap-[9.14px]">
                <Button
                  variant="outline"
                  size="icon"
                  className="p-2 bg-neutral-25 rounded-[7.18px] border-[0.47px] border-solid shadow-[0.68px_0.68px_8.16px_#ffffff1a,inset_0px_0px_0px_#ffffff40,inset_0px_0px_0.68px_#ffffff1a] backdrop-blur-[27.54px] border-neutral-25"
                  onClick={handleNextMetric} 
                >
                  <img
                    className="w-5 h-5 rotate-180"
                    alt="Frame"
                    src="/img/frame.svg"
                  />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="p-2 bg-neutral-25 rounded-[7.18px] border-[0.47px] border-solid shadow-[0.68px_0.68px_8.16px_#ffffff1a,inset_0px_0px_0px_#ffffff40,inset_0px_0px_0.68px_#ffffff1a] backdrop-blur-[27.54px] border-neutral-25"
                  onClick={handlePrevMetric} 
                >
                  <img
                    className="w-5 h-5 rotate-180"
                    alt="Frame"
                    src="/img/frame-1.svg"
                  />
                </Button>
              </div>

              <div className="flex flex-col items-end justify-center gap-6 flex-1 grow">
                <div className="flex-col items-end justify-center gap-3 flex w-full">
                  <div className="relative w-fit mt-[-1.00px] rotate-180 [font-family:'Lato',Helvetica] font-light text-neutral-75 text-sm tracking-[0] leading-normal">
                   {chartConfig[currentMetric].label.toUpperCase()} ✈
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between w-full">
            <Dialog open={isLiveViewOpen} onOpenChange={setIsLiveViewOpen}>
              <DialogTrigger asChild>
                <Button className="h-[33px] bg-slate-900 px-4 py-2 rounded-md rotate-180">
                  <div className="relative w-fit mt-[-4.50px] mb-[-2.50px] font-body-medium font-[number:var(--body-medium-font-weight)] text-white text-[length:var(--body-medium-font-size)] tracking-[var(--body-medium-letter-spacing)] leading-[var(--body-medium-line-height)] whitespace-nowrap [font-style:var(--body-medium-font-style)]">
                    🔍 실시간 보기
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg p-6">
                <DialogTitle>실시간 웹캠 확인</DialogTitle>
                <DialogDescription>디바이스에서 실시간으로 웹캠 이미지를 가져옵니다.</DialogDescription>
                <div className="flex items-center justify-center mt-4">
                  {webcamImage ? (
                    <img src={webcamImage} alt="Live Webcam" className="rounded-lg shadow-md w-full" />
                  ) : (
                    <p className="text-center text-gray-500">웹캠 이미지를 불러오는 중...</p>
                  )}
                </div>
                <Button variant="outline" className="mt-4 w-full" onClick={fetchWebcamImage}>
                  새로고침
                </Button>
              </DialogContent>
            </Dialog>

            <div className="w-fit font-normal text-transparent text-base whitespace-nowrap rotate-180 [font-family:'Lato',Helvetica] tracking-[0] leading-normal">
              <span className="text-white">움직임 감지: </span>
              <span className="font-bold text-[#ffa500]">{Math.floor((Date.now() / 1000 - motionDetectedTime))}초전</span>
            </div>
          </div>

          <div className="flex flex-col items-end justify-center gap-4 w-full">
            <div className="flex items-center justify-around gap-5 w-full">
              <div className="flex-1 mt-[-1.00px] rotate-180 [font-family:'Lato',Helvetica] font-medium text-neutral-100 text-lg tracking-[0] leading-normal">
                Digital Twin Status
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Air Purifier Card */}
      <Card className="w-full lg:w-[calc(25%-12px)] p-6 bg-grey-50 rounded-2xl overflow-hidden -rotate-180 shadow-[2px_4px_24px_#ffffff1f,inset_0px_1px_1px_#ffffff40,inset_0px_1px_1px_#ffffff1a] backdrop-blur-[6px]">
        <CardContent className="p-0 flex flex-col gap-7">
          <div className="flex flex-col items-end justify-center gap-7 w-full">
            <div className={`flex flex-col items-end justify-center gap-6 w-full ${isPurifierOn ? "opacity-100" : "opacity-50"}`}>
              {purifierSettings.map((setting) => (
                <div key={setting.label} className="flex items-center justify-between w-full">
                  {setting.key === "purifierAutoOn" || setting.key === "purifierAutoOff" ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          disabled={!isPurifierOn}
                          className={`h-[33px] px-4 py-2 rounded-md rotate-180 ${isPurifierOn ? 'bg-slate-900 text-white' : 'bg-gray-300 text-gray-500'}`}
                        >
                          <div className="relative w-fit mt-[-4.50px] mb-[-2.50px] font-body-medium text-white text-sm">
                            {formatTimeToHHMM(
                              setting.key === "purifierAutoOn" ? purifierAutoOn : purifierAutoOff
                            )}
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <div className="flex flex-col gap-3 px-2 py-2">
                          <div className="flex justify-between items-center gap-2">
                            <Select onValueChange={(hour) => setSelectedHour(hour)}>
                              <SelectTrigger className="w-[64px] bg-neutral-100 text-neutral-800 text-sm font-medium shadow-sm">
                                <SelectValue placeholder="H" />
                              </SelectTrigger>
                              <SelectContent>
                                {[...Array(24).keys()].map((h) => (
                                  <SelectItem key={h} value={String(h).padStart(2, "0")}>
                                    {String(h).padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select onValueChange={(minute) => setSelectedMinute(minute)}>
                              <SelectTrigger className="w-[64px] bg-neutral-100 text-neutral-800 text-sm font-medium shadow-sm">
                                <SelectValue placeholder="M" />
                              </SelectTrigger>
                              <SelectContent>
                                {[...Array(60).keys()].map((m) => (
                                  <SelectItem key={m} value={String(m).padStart(2, "0")}>
                                    {String(m).padStart(2, "0")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            className="w-full h-9 bg-blue-600 text-white text-sm font-semibold rounded-md"
                            onClick={() => {
                              if (selectedHour && selectedMinute) {
                                const newMinutes = parseTimeStringToMinutes(`${selectedHour}:${selectedMinute}`);
                                sendControlSignal(setting.key, newMinutes);
                              }
                            }}
                          >
                            적용
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <>
                      <Button
                        disabled={!isPurifierOn}
                        className={`h-[33px] px-4 py-2 rounded-md rotate-180 ${isPurifierOn ? 'bg-slate-900 text-white' : 'bg-gray-300 text-gray-500'}`}
                        onClick={() => {
                          let newValue;
                          if (setting.key === "purifierMode") {
                            newValue = cycleOption(purifierMode, [0, 1]);
                          } else if (setting.key === "purifierSpeed") {
                            newValue = cycleOption(purifierSpeed, [1, 2, 3]);
                          } else {
                            return;
                          }
                          sendControlSignal(setting.key, newValue);
                        }}
                      >
                        <div className="relative w-fit mt-[-4.50px] mb-[-2.50px] font-body-medium text-white text-[length:var(--body-medium-font-size)]">
                          {setting.value}
                        </div>
                      </Button>
                    </>
                  )}

                  <div className="w-fit rotate-180 [font-family:'Lato',Helvetica] font-normal text-neutral-100 text-base tracking-[0] leading-normal whitespace-nowrap">
                    {setting.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-2.5 py-0 w-full">
              <div className="inline-flex flex-col items-center justify-center gap-2">
                <div className="w-fit mt-[-1.00px] font-light text-neutral-75 text-sm rotate-180 [font-family:'Lato',Helvetica] tracking-[0] leading-normal">
                  종합 점수
                </div>

                <div className="inline-flex items-center justify-end gap-0.5">
                  <div className="w-fit font-semibold text-neutral-100 text-2xl rotate-180 [font-family:'Lato',Helvetica] tracking-[0] leading-normal">
                    점
                  </div>

                  <div className="w-fit mt-[-1.00px] rotate-180 [font-family:'Lato',Helvetica] font-semibold text-neutral-100 text-4xl tracking-[0] leading-normal whitespace-nowrap">
                    {air_quality_score}
                  </div>
                </div>
              </div>

              <div className="inline-flex flex-col items-center justify-center gap-2">
                <div className="w-fit mt-[-1.00px] font-light text-neutral-75 text-sm rotate-180 [font-family:'Lato',Helvetica] tracking-[0] leading-normal">
                  미세먼지
                </div>

                <div className="inline-flex items-center justify-end gap-0.5">
                  <div className="w-fit rotate-180 [font-family:'Lato',Helvetica] font-semibold text-neutral-100 text-2xl tracking-[0] leading-normal">
                    µg/m³
                  </div>

                  <div className="w-fit mt-[-1.00px] rotate-180 [font-family:'Lato',Helvetica] font-semibold text-neutral-100 text-4xl tracking-[0] leading-normal whitespace-nowrap">
                    {pm25_filtered}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between w-full">
            <div className="inline-flex items-center gap-2 rotate-180">
              <Switch
                checked={isPurifierOn}
                onCheckedChange={() => sendControlSignal("isPurifierOn", !isPurifierOn)}
                className={`${
                  isPurifierOn ? "bg-green-500" : "bg-slate-200"
                } rounded-[50px]`}
              />
            </div>

            <div className="w-fit rotate-180 [font-family:'Lato',Helvetica] font-medium text-neutral-100 text-lg tracking-[0] leading-normal">
              Air Purifier
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* Air Diffuser Card */}
      <Card className="w-full lg:w-[calc(25%-12px)] p-6 bg-grey-50 rounded-2xl overflow-hidden -rotate-180 shadow-[2px_4px_24px_#ffffff1f,inset_0px_1px_1px_#ffffff40,inset_0px_1px_1px_#ffffff1a] backdrop-blur-[6px]">
        <CardContent className="p-0 flex flex-col gap-7">
          <div className="flex flex-col items-end justify-center gap-7 w-full">
            <div className={`flex flex-col items-end justify-center gap-6 w-full ${isDiffuserOn ? "opacity-100" : "opacity-50"}`}>
              {diffuserSettings.map((setting) => (
                <div key={setting.label} className="flex items-center justify-between w-full">
                  <Button
                    disabled={!isDiffuserOn}
                    className={`h-[33px] px-4 py-2 rounded-md rotate-180 ${isDiffuserOn ? 'bg-slate-900 text-white' : 'bg-gray-300 text-gray-500'}`}
                    onClick={() => {
                      let newValue;
                      if (setting.key === "diffuserMode") {
                        newValue = cycleOption(diffuserMode, [0, 1]);
                      } else if (setting.key === "diffuserSpeed") {
                        newValue = cycleOption(diffuserSpeed, [1, 2, 3]);
                      } else if (setting.key === "diffuserType") {
                        newValue = cycleOption(diffuserType, [1, 2, 3]);
                      } else if (setting.key === "diffuserPeriod") {
                        newValue = cycleOption(diffuserPeriod, [300, 600, 900]);
                      } else {
                        return;
                      }
                      sendControlSignal(setting.key, newValue);
                    }}
                  >
                    <div className="relative w-fit mt-[-4.50px] mb-[-2.50px] font-body-medium font-[number:var(--body-medium-font-weight)] text-white text-[length:var(--body-medium-font-size)] tracking-[var(--body-medium-letter-spacing)] leading-[var(--body-medium-line-height)] whitespace-nowrap [font-style:var(--body-medium-font-style)]">
                      {setting.value}
                    </div>
                  </Button>

                  <div className="w-fit rotate-180 [font-family:'Lato',Helvetica] font-normal text-neutral-100 text-base tracking-[0] leading-normal whitespace-nowrap">
                    {setting.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-2.5 py-0 w-full">
              <div className="inline-flex flex-col items-center justify-center gap-2">
                <div className="w-fit mt-[-1.00px] rotate-180 [font-family:'Lato',Helvetica] font-light text-neutral-75 text-sm tracking-[0] leading-normal">
                  CO₂
                </div>

                <div className="inline-flex items-center justify-end gap-0.5">
                  <div className="w-fit rotate-180 [font-family:'Lato',Helvetica] font-semibold text-neutral-100 text-2xl tracking-[0] leading-normal">
                    ppm
                  </div>

                  <div className="w-fit mt-[-1.00px] rotate-180 [font-family:'Lato',Helvetica] font-semibold text-neutral-100 text-4xl tracking-[0] leading-normal whitespace-nowrap">
                    {eco2}
                  </div>
                </div>
              </div>

              <div className="inline-flex flex-col items-center justify-center gap-2">
                <div className="w-fit mt-[-1.00px] rotate-180 [font-family:'Lato',Helvetica] font-light text-neutral-75 text-sm tracking-[0] leading-normal">
                  VOC
                </div>

                <div className="inline-flex items-center justify-end gap-0.5">
                  <div className="w-fit rotate-180 [font-family:'Lato',Helvetica] font-semibold text-neutral-100 text-2xl tracking-[0] leading-normal">
                    ppb
                  </div>

                  <div className="w-fit mt-[-1.00px] rotate-180 [font-family:'Lato',Helvetica] font-semibold text-neutral-100 text-4xl tracking-[0] leading-normal whitespace-nowrap">
                    {tvoc}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between w-full">
            <div className="inline-flex items-center gap-2 rotate-180">
              <Switch
                checked={isDiffuserOn}
                onCheckedChange={() => sendControlSignal("isDiffuserOn", !isDiffuserOn)}
                className={`${
                  isDiffuserOn ? "bg-green-500" : "bg-slate-200"
                } rounded-[50px]`}
              />
            </div>

            <div className="w-fit rotate-180 [font-family:'Lato',Helvetica] font-medium text-neutral-100 text-lg tracking-[0] leading-normal">
              Air Diffuser
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Brief Card */}
      <Card className="w-full lg:w-[calc(25%-12px)] p-6 bg-grey-50 rounded-2xl overflow-hidden -rotate-180 shadow-[2px_4px_24px_#ffffff1f,inset_0px_1px_1px_#ffffff40,inset_0px_1px_1px_#ffffff1a] backdrop-blur-[6px]">
        <CardContent className="p-0 flex flex-col gap-7">
          <div className="flex flex-col items-end justify-center gap-7 w-full">
            <div className="flex flex-col items-end justify-center gap-6 w-full">
              <div className="flex items-center justify-between w-full">
                <div className="inline-flex items-start justify-end gap-[9.14px]">
                  <Button
                    disabled={true}
                    variant="outline"
                    size="icon"
                    className="p-2 bg-neutral-25 rounded-[7.18px] border-[0.47px] border-solid shadow-[0.68px_0.68px_8.16px_#ffffff1a,inset_0px_0px_0px_#ffffff40,inset_0px_0px_0.68px_#ffffff1a] backdrop-blur-[27.54px] border-neutral-25"
                  >
                    <img
                      className="w-5 h-5 rotate-180"
                      alt="Frame"
                      src="/img/frame-2.svg"
                    />
                  </Button>

                  <Button
                    disabled={true}
                    variant="outline"
                    size="icon"
                    className="p-2 bg-neutral-25 rounded-[7.18px] border-[0.47px] border-solid shadow-[0.68px_0.68px_8.16px_#ffffff1a,inset_0px_0px_0px_#ffffff40,inset_0px_0px_0.68px_#ffffff1a] backdrop-blur-[27.54px] border-neutral-25"
                  >
                    <img
                      className="w-5 h-5 rotate-180"
                      alt="Frame"
                      src="/img/frame-3.svg"
                    />
                  </Button>
                </div>

                <div className="relative w-[143.43px] h-[33px]">
                  <Button
                    disabled={true}
                    variant="outline"
                    className="absolute top-0 left-[17px] bg-white border border-solid border-slate-200 h-[33px] px-4 py-2 rounded-md rotate-180"
                  >
                    <div className="relative w-fit mt-[-4.50px] mb-[-2.50px] font-body-medium font-[number:var(--body-medium-font-weight)] text-[#0f172a] text-[length:var(--body-medium-font-size)] tracking-[var(--body-medium-letter-spacing)] leading-[var(--body-medium-line-height)] whitespace-nowrap [font-style:var(--body-medium-font-style)]">
                      취소
                    </div>
                  </Button>

                  <Button className="absolute top-0 left-[85px] bg-slate-900 h-[33px] px-4 py-2 rounded-md rotate-180" disabled={true}>
                    <div className="relative w-fit mt-[-4.50px] mb-[-2.50px] font-body-medium font-[number:var(--body-medium-font-weight)] text-white text-[length:var(--body-medium-font-size)] tracking-[var(--body-medium-letter-spacing)] leading-[var(--body-medium-line-height)] whitespace-nowrap [font-style:var(--body-medium-font-style)]">
                      확인
                    </div>
                  </Button>
                </div>
              </div>

              <div className="flex flex-col h-[95px] items-end justify-center gap-3 w-full">
                <div className="flex items-center justify-end gap-3 flex-1 w-full grow">
                  <div className="self-stretch w-full mt-[-1.00px] font-semibold text-transparent text-lg overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:4] [-webkit-box-orient:vertical] rotate-180 [font-family:'Lato',Helvetica] tracking-[0] leading-normal">
                    {aiRecommendation}
                  </div>
                </div>
              </div>

              <div className="flex flex-col h-[95px] items-end justify-center gap-3 w-full">
                <div className="flex items-center justify-end gap-3 flex-1 w-full grow">
                  <SmileIcon className="w-6 h-6 ml-[-3.67px] rotate-180" />
                  <div className="self-stretch w-full mt-[-1.00px] font-semibold text-transparent text-lg overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:7] [-webkit-box-orient:vertical] rotate-180 [font-family:'Lato',Helvetica] tracking-[0] leading-normal">
                    <span className="text-white">현재 시각</span>
                    <span className="text-[#ffa500]"> {currentTime}</span>
                    <span className="text-white">, 바깥 기온은 </span>
                    <span className="text-[#ffa500]">{temp}도</span>
                    <span className="text-white">
                      {" "}
                      입니다.
                      <br />
                      미세먼지는{" "}
                    </span>
                    <span className="text-[#ffa500]">보통</span>
                    <span className="text-white">입니다. <br/><br/>추천 기능이 있는대로 알려드릴게요.</span>
                  </div>
                </div>

                <div className="w-fit font-light text-neutral-75 text-sm rotate-180 [font-family:'Lato',Helvetica] tracking-[0] leading-normal">
                  기본정보
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end justify-center gap-4 w-full">
            <div className="flex items-center justify-around gap-5 w-full">
              <div className="flex-1 mt-[-1.00px] rotate-180 [font-family:'Lato',Helvetica] font-medium text-neutral-100 text-lg tracking-[0] leading-normal">
                AI brief
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
        </section>
      </div>
    </>
  );
};

