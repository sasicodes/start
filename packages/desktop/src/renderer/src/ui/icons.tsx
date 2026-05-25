interface IconProps {
  class?: string;
}

export const CheckIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path d="M2.5 15.5L9.20588 20.5L21.5 3.5" stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" />
  </svg>
);

export const XIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M6.75 6.75L17.25 17.25M17.25 6.75L6.75 17.25"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const ChevronLeftIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M15 20L9.12136 14.1213C7.94978 12.9498 7.94978 11.0503 9.12135 9.8787L15 4"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const ChevronRightIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M9 4L14.8787 9.87866C16.0503 11.0502 16.0503 12.9497 14.8787 14.1213L9 20"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const RefreshIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M13 21C13.5523 21 14 20.5523 14 20C14 19.4477 13.5523 19 13 19C12.4477 19 12 19.4477 12 20C12 20.5523 12.4477 21 13 21Z"
      fill="currentColor"
    />
    <path
      d="M21 11C21 10.4477 20.5523 9.99999 20 9.99999C19.4477 9.99999 19 10.4477 19 11C19 11.5523 19.4477 12 20 12C20.5523 12 21 11.5523 21 11Z"
      fill="currentColor"
    />
    <path
      d="M19.9295 14.2679C20.4078 14.5441 20.5716 15.1557 20.2955 15.634C20.0193 16.1123 19.4078 16.2761 18.9295 16C18.4512 15.7238 18.2873 15.1123 18.5634 14.634C18.8396 14.1557 19.4512 13.9918 19.9295 14.2679Z"
      fill="currentColor"
    />
    <path
      d="M17.3676 19.2942C17.8459 19.0181 18.0098 18.4065 17.7336 17.9282C17.4575 17.4499 16.8459 17.286 16.3676 17.5621C15.8893 17.8383 15.7254 18.4499 16.0016 18.9282C16.2777 19.4065 16.8893 19.5703 17.3676 19.2942Z"
      fill="currentColor"
    />
    <path
      d="M18.9269 7.99998C18.4487 8.27612 17.8371 8.11225 17.5609 7.63396C17.2848 7.15566 17.4487 6.54407 17.9269 6.26793C18.4052 5.99179 19.0168 6.15566 19.293 6.63396C19.5691 7.11225 19.4052 7.72384 18.9269 7.99998Z"
      fill="currentColor"
    />
    <path
      d="M9.25 14.75V20.25H3.75"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M15.2493 4.41452C14.2521 3.98683 13.1537 3.75 12 3.75C7.44365 3.75 3.75 7.44365 3.75 12C3.75 15.498 5.92698 18.4875 9 19.6876"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const ScreenshotIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M8.25 20.25H6.75C5.09315 20.25 3.75 18.9069 3.75 17.25V15.75M15.75 20.25H17.25C18.9069 20.25 20.25 18.9069 20.25 17.25V15.75M3.75 8.25V6.75C3.75 5.09315 5.09315 3.75 6.75 3.75H8.25M15.75 3.75H17.25C18.9069 3.75 20.25 5.09315 20.25 6.75V8.25"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M7.75 13.25V10.1642C7.75 9.38317 8.38317 8.75 9.16421 8.75C9.53929 8.75 9.899 8.601 10.1642 8.33579L10.25 8.25C10.5701 7.92986 11.0044 7.75 11.4571 7.75H12.5429C12.9956 7.75 13.4299 7.92986 13.75 8.25L13.8358 8.33579C14.101 8.601 14.4607 8.75 14.8358 8.75C15.6168 8.75 16.25 9.38317 16.25 10.1642V13.25C16.25 14.3546 15.3546 15.25 14.25 15.25H9.75C8.64543 15.25 7.75 14.3546 7.75 13.25Z"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M12 11.85V11.835M12.75 11.85C12.75 12.2642 12.4142 12.6 12 12.6C11.5858 12.6 11.25 12.2642 11.25 11.85C11.25 11.4358 11.5858 11.1 12 11.1C12.4142 11.1 12.75 11.4358 12.75 11.85Z"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const BrowserEmptyIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M19.7783 4.22184L4.22197 19.7782M21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12ZM18.5163 18.516C17.3167 19.7156 13.427 17.7707 9.82826 14.172C6.22955 10.5733 4.28467 6.68352 5.48424 5.48395C6.68381 4.28438 10.5736 6.22927 14.1723 9.82798C17.771 13.4267 19.7159 17.3165 18.5163 18.516Z"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const BrowserIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      clip-rule="evenodd"
      d="M4.41459 5.4838C9.06327 0.0735695 17.6827 1.14152 20.905 7.46127C18.6367 7.46205 15.0847 7.46065 13.161 7.46127C11.7657 7.46174 10.865 7.43002 9.88935 7.94361C8.74249 8.54735 7.87704 9.6664 7.57501 10.9809L4.41459 5.4838Z"
      fill="currentColor"
      fill-rule="evenodd"
    />
    <path
      clip-rule="evenodd"
      d="M8.67296 11.9995C8.67296 13.8331 10.1639 15.3249 11.9965 15.3249C13.829 15.3249 15.3199 13.8332 15.3199 11.9995C15.3199 10.1659 13.829 8.67407 11.9965 8.67407C10.1639 8.67407 8.67296 10.1659 8.67296 11.9995Z"
      fill="currentColor"
      fill-rule="evenodd"
    />
    <path
      clip-rule="evenodd"
      d="M13.2863 16.3521C11.4209 16.9064 9.23796 16.2916 8.04219 14.2276C7.12939 12.6521 4.71771 8.45079 3.62163 6.54051C-0.217376 12.4246 3.09133 20.4431 10.0609 21.8117L13.2863 16.3521Z"
      fill="currentColor"
      fill-rule="evenodd"
    />
    <path
      clip-rule="evenodd"
      d="M15.0837 8.67407C16.6374 10.119 16.9758 12.459 15.9233 14.2734C15.1304 15.6404 12.5998 19.9116 11.3732 21.9798C18.5541 22.4225 23.7888 15.3848 21.4243 8.67407H15.0837Z"
      fill="currentColor"
      fill-rule="evenodd"
    />
  </svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M20 9L14.1213 14.8787C12.9498 16.0503 11.0503 16.0503 9.8787 14.8787L4 9"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const CycleVerticalIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M8 9L11.1161 5.8839C11.6043 5.3957 12.3957 5.3957 12.8839 5.8839L16 9"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M16 15L12.8839 18.1161C12.3957 18.6043 11.6043 18.6043 11.1161 18.1161L8 15"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const DiffSplitIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <rect
      x="3.75"
      y="5.5"
      width="6.75"
      height="13"
      rx="1.5"
      class="fill-danger/35 opacity-0 transition-opacity duration-100 ease-out group-hover/diff-view:opacity-100 group-focus-visible/diff-view:opacity-100"
    />
    <rect
      x="13.5"
      y="5.5"
      width="6.75"
      height="13"
      rx="1.5"
      class="fill-success/35 opacity-0 transition-opacity duration-100 ease-out group-hover/diff-view:opacity-100 group-focus-visible/diff-view:opacity-100"
    />
    <path
      d="M12 2.75V21.25M8.25 4.75H5.75C4.09315 4.75 2.75 6.09315 2.75 7.75V16.25C2.75 17.9069 4.09315 19.25 5.75 19.25H8.25M15.75 19.25H18.25C19.9069 19.25 21.25 17.9069 21.25 16.25V7.75C21.25 6.09315 19.9069 4.75 18.25 4.75H15.75"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const ChangesIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M9.25 10.5H14.75M12 7.75V13.25"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M9.25 16L14.75 16"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M20.25 17.25V6.75C20.25 5.09315 18.9069 3.75 17.25 3.75H6.75C5.09315 3.75 3.75 5.09315 3.75 6.75V17.25C3.75 18.9069 5.09315 20.25 6.75 20.25H17.25C18.9069 20.25 20.25 18.9069 20.25 17.25Z"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const GeminiIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M20.2246 10.888C18.6066 10.1911 17.1915 9.23659 15.9769 8.02312C14.7634 6.80966 13.8077 5.39335 13.112 3.7754C12.846 3.15614 12.63 2.51778 12.4653 1.86392C12.4116 1.65034 12.2207 1.5 12 1.5C11.7793 1.5 11.5884 1.65034 11.5347 1.86392C11.37 2.51778 11.1552 3.15375 10.888 3.7754C10.1911 5.39335 9.23659 6.80966 8.02312 8.02312C6.80966 9.2354 5.39335 10.1911 3.7754 10.888C3.15614 11.154 2.51778 11.37 1.86392 11.5347C1.65034 11.5884 1.5 11.7793 1.5 12C1.5 12.2207 1.65034 12.4116 1.86392 12.4653C2.51778 12.63 3.15375 12.8448 3.7754 13.112C5.39335 13.8089 6.80847 14.7634 8.02312 15.9769C9.23659 17.1903 10.1923 18.6066 10.888 20.2246C11.1552 20.8451 11.37 21.4822 11.5347 22.1361C11.5607 22.2399 11.6206 22.332 11.7049 22.3979C11.7891 22.4638 11.893 22.4998 12 22.5C12.2207 22.5 12.4116 22.3497 12.4653 22.1361C12.63 21.4822 12.8448 20.8462 13.112 20.2246C13.8089 18.6066 14.7634 17.1915 15.9769 15.9769C17.1903 14.7634 18.6066 13.8077 20.2246 13.112C20.8451 12.8448 21.4822 12.63 22.1361 12.4653C22.2399 12.4393 22.332 12.3794 22.3979 12.2951C22.4638 12.2109 22.4998 12.107 22.5 12C22.5 11.7793 22.3497 11.5884 22.1361 11.5347C21.4822 11.37 20.8462 11.1552 20.2246 10.888Z"
      fill="currentColor"
    />
  </svg>
);

export const AnthropicIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M17.0977 4H13.5611L19.8941 20H23.3484L17.0977 4ZM6.89916 4L0.648438 20H4.18503L5.58322 16.6359H12.1629L13.4789 19.9179H17.0155L10.6003 4H6.98141H6.89916ZM6.57018 13.6821L8.70858 8.02051L10.9292 13.6821H6.65242H6.57018Z"
      fill="currentColor"
    />
  </svg>
);

export const OpenAIIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" stroke-width="1.5" viewBox="0 0 24 24" {...props}>
    <path
      d="M9.79648 9.34799V7.49548C9.79648 7.33946 9.85502 7.22239 9.99146 7.14447L13.7161 4.9995C14.2231 4.70702 14.8276 4.57058 15.4515 4.57058C17.7915 4.57058 19.2736 6.38413 19.2736 8.31455C19.2736 8.451 19.2736 8.60703 19.254 8.76305L15.393 6.501C15.159 6.36456 14.925 6.36456 14.691 6.501L9.79648 9.34799ZM18.4935 16.5631V12.1364C18.4935 11.8634 18.3764 11.6684 18.1425 11.5319L13.248 8.68494L14.847 7.76838C14.9834 7.69046 15.1005 7.69046 15.237 7.76838L18.9615 9.91336C20.0342 10.5374 20.7555 11.8634 20.7555 13.1503C20.7555 14.6322 19.8782 15.9973 18.4935 16.5628V16.5631ZM8.64599 12.663L7.04699 11.7271C6.91054 11.6492 6.85201 11.5321 6.85201 11.3761V7.08614C6.85201 4.99968 8.45101 3.42007 10.6156 3.42007C11.4346 3.42007 12.195 3.69316 12.8386 4.18061L8.99717 6.40369C8.76323 6.54015 8.64617 6.73513 8.64617 7.00822V12.6632L8.64599 12.663ZM12.0878 14.652L9.79648 13.3651V10.6351L12.0878 9.34818L14.3789 10.6351V13.3651L12.0878 14.652ZM13.56 20.5801C12.741 20.5801 11.9806 20.307 11.3369 19.8196L15.1784 17.5964C15.4123 17.46 15.5294 17.2651 15.5294 16.992V11.3369L17.148 12.2729C17.2845 12.3508 17.3429 12.4679 17.3429 12.6239V16.9139C17.3429 19.0003 15.7243 20.5801 13.56 20.5801ZM8.93846 16.2316L5.21387 14.0866C4.14128 13.4625 3.41989 12.1366 3.41989 10.8497C3.41989 9.34818 4.31688 8.00269 5.70131 7.43713V11.8831C5.70131 12.1562 5.81838 12.3512 6.05232 12.4876L10.9274 15.315L9.32842 16.2316C9.19196 16.3096 9.0749 16.3096 8.93846 16.2316ZM8.72408 19.4297C6.52057 19.4297 4.90201 17.772 4.90201 15.7246C4.90201 15.5685 4.92158 15.4125 4.94097 15.2565L8.78243 17.4796C9.01637 17.616 9.2505 17.616 9.48444 17.4796L14.3789 14.6522V16.5047C14.3789 16.6607 14.3204 16.7777 14.1839 16.8557L10.4593 19.0007C9.95233 19.2931 9.3478 19.4297 8.72391 19.4297H8.72408ZM13.56 21.75C15.9195 21.75 17.8889 20.073 18.3376 17.85C20.5215 17.2844 21.9256 15.2369 21.9256 13.1505C21.9256 11.7855 21.3406 10.4595 20.2876 9.50401C20.3851 9.09448 20.4437 8.68494 20.4437 8.27559C20.4437 5.48714 18.1816 3.4005 15.5686 3.4005C15.0422 3.4005 14.5351 3.47842 14.0281 3.65401C13.1505 2.79599 11.9415 2.25 10.6156 2.25C8.25602 2.25 6.28663 3.92691 5.83795 6.14999C3.65402 6.71555 2.25 8.76305 2.25 10.8495C2.25 12.2146 2.83494 13.5405 3.88796 14.496C3.79046 14.9055 3.73194 15.315 3.73194 15.7244C3.73194 18.5128 5.99397 20.5994 8.60703 20.5994C9.13344 20.5994 9.64047 20.5216 10.1475 20.346C11.0249 21.204 12.2339 21.75 13.56 21.75Z"
      fill="currentColor"
    />
  </svg>
);

export const ArrowUpIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" stroke-width={strokeWidth} viewBox="0 0 24 24" {...props}>
    <path d="M12 3.5V20.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M5.5 10L12 3.5L18.5 10" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

export const CodeIcon = ({ strokeWidth = 1.5, ...props }: IconProps & { strokeWidth?: number }) => (
  <svg aria-hidden="true" fill="none" stroke-width={strokeWidth} viewBox="0 0 24 24" {...props}>
    <path d="M8.25 5.75L2 12L8.25 18.25" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M15.75 5.75L22 12L15.75 18.25" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

export const StopIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" stroke-width="1.5" viewBox="0 0 24 24" {...props}>
    <path
      d="M20.5 15.7V8.3C20.5 6.61984 20.5 5.77976 20.173 5.13803C19.8854 4.57354 19.4265 4.1146 18.862 3.82698C18.2202 3.5 17.3802 3.5 15.7 3.5H8.3C6.61984 3.5 5.77976 3.5 5.13803 3.82698C4.57354 4.1146 4.1146 4.57354 3.82698 5.13803C3.5 5.77976 3.5 6.61984 3.5 8.3V15.7C3.5 17.3802 3.5 18.2202 3.82698 18.862C4.1146 19.4265 4.57354 19.8854 5.13803 20.173C5.77976 20.5 6.61984 20.5 8.3 20.5H15.7C17.3802 20.5 18.2202 20.5 18.862 20.173C19.4265 19.8854 19.8854 19.4265 20.173 18.862C20.5 18.2202 20.5 17.3802 20.5 15.7Z"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const CopyIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" stroke-width="1.5" viewBox="0 0 24 24" {...props}>
    <path
      d="M16.5 16.5C17.43 16.5 17.895 16.5 18.2765 16.3978C19.3117 16.1204 20.1204 15.3117 20.3978 14.2765C20.5 13.895 20.5 13.43 20.5 12.5V8.3C20.5 6.61984 20.5 5.77976 20.173 5.13803C19.8854 4.57354 19.4265 4.1146 18.862 3.82698C18.2202 3.5 17.3802 3.5 15.7 3.5H12C11.07 3.5 10.605 3.5 10.2235 3.60222C9.18827 3.87962 8.37962 4.68827 8.10222 5.72354C8 6.10504 8 6.57003 8 7.5M16.5 12.3V15.7C16.5 17.3802 16.5 18.2202 16.173 18.862C15.8854 19.4265 15.4265 19.8854 14.862 20.173C14.2202 20.5 13.3802 20.5 11.7 20.5H8.3C6.61984 20.5 5.77976 20.5 5.13803 20.173C4.57354 19.8854 4.1146 19.4265 3.82698 18.862C3.5 18.2202 3.5 17.3802 3.5 15.7V12.3C3.5 10.6198 3.5 9.77976 3.82698 9.13803C4.1146 8.57354 4.57354 8.1146 5.13803 7.82698C5.77976 7.5 6.61984 7.5 8.3 7.5H11.7C13.3802 7.5 14.2202 7.5 14.862 7.82698C15.4265 8.1146 15.8854 8.57354 16.173 9.13803C16.5 9.77976 16.5 10.6198 16.5 12.3Z"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const TrashIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M4.75 6.5L5.58982 18.4601C5.70016 20.0316 7.00714 21.25 8.58245 21.25H15.4175C16.9929 21.25 18.2998 20.0316 18.4102 18.4601L19.25 6.5"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path d="M3.25 5.75H20.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path
      d="M8.52466 5.58289C8.73085 3.84652 10.2082 2.5 12.0001 2.5C13.7919 2.5 15.2693 3.84652 15.4755 5.58289"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path d="M10 10.5V16.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M14 10.5V16.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
  </svg>
);

export const GearIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M19.2479 6.923L12.9979 3.32455C12.3802 2.96888 11.6198 2.96888 11.0021 3.32455L4.75208 6.92297C4.13211 7.27992 3.75 7.94083 3.75 8.65622V15.3439C3.75 16.0593 4.13213 16.7202 4.75213 17.0772L11.0021 20.6754C11.6198 21.031 12.3802 21.031 12.9979 20.6753L19.2479 17.0769C19.8679 16.7199 20.25 16.059 20.25 15.3436V8.65625C20.25 7.94086 19.8679 7.27995 19.2479 6.923Z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="square"
    />
    <path
      d="M15.25 12C15.25 13.7949 13.7949 15.25 12 15.25C10.2051 15.25 8.75 13.7949 8.75 12C8.75 10.2051 10.2051 8.75 12 8.75C13.7949 8.75 15.25 10.2051 15.25 12Z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="square"
    />
  </svg>
);

export const SettingsIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" />
    <path
      d="M7.37506 3.98898C6.3995 4.55222 5.99767 5.75491 6.43871 6.79146L6.62174 7.22161C5.98033 7.94301 5.48186 8.79434 5.17077 9.73116L4.70884 9.78747C3.59064 9.92379 2.75 10.8731 2.75 11.9996C2.75 13.1261 3.59064 14.0754 4.70884 14.2117L5.1704 14.268C5.48144 15.2052 5.97999 16.0568 6.62157 16.7785L6.43873 17.2082C5.99769 18.2447 6.39952 19.4474 7.37508 20.0107C8.35064 20.5739 9.59311 20.3206 10.2703 19.4203L10.55 19.0484C11.0184 19.1442 11.5034 19.1946 12.0001 19.1946C12.4969 19.1946 12.9818 19.1442 13.4503 19.0484L13.7299 19.4201C14.407 20.3203 15.6495 20.5737 16.6251 20.0105C17.6006 19.4472 18.0025 18.2445 17.5614 17.208L17.3786 16.7785C18.0202 16.0568 18.5188 15.2052 18.8298 14.268L19.2912 14.2117C20.4094 14.0754 21.25 13.1261 21.25 11.9996C21.25 10.8731 20.4094 9.92379 19.2912 9.78747L18.8294 9.73119C18.7517 9.49698 18.6622 9.26812 18.5617 9.04529C18.2601 8.37679 17.8594 7.76262 17.3784 7.22156L17.5613 6.7916C18.0024 5.75506 17.6005 4.55237 16.625 3.98913C15.6494 3.42589 14.4069 3.67923 13.7298 4.57947L13.4497 4.95176C12.9815 4.85595 12.4967 4.8057 12.0001 4.8057C11.5035 4.8057 11.0187 4.85601 10.5504 4.95181L10.2702 4.57932C9.59309 3.67909 8.35062 3.42574 7.37506 3.98898Z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
  </svg>
);

export const HistoryIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M12 7.75V12L15.5 15.5"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M2.75 4.75V8.75H6.75"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M3.25 15.0833C4.52169 18.676 7.95303 21.25 11.9864 21.25C17.1026 21.25 21.25 17.1086 21.25 12C21.25 6.89137 17.1026 2.75 11.9864 2.75C8.14808 2.75 4.85497 5.08106 3.44947 8.40278"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const FolderIcon = (props: IconProps) => (
  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" {...props}>
    <path
      d="M8.72581 3.75H5.75C4.09315 3.75 2.75 5.09315 2.75 6.75V16.25C2.75 17.9069 4.09315 19.25 5.75 19.25H18.25C19.9069 19.25 21.25 17.9069 21.25 16.25V8.75C21.25 7.09315 19.9069 5.75 18.25 5.75H13.2186C12.4372 5.75 11.6866 5.4451 11.1266 4.90018L10.8179 4.59982C10.2578 4.0549 9.50723 3.75 8.72581 3.75Z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M21.25 12.75C21.25 11.0931 19.9069 9.75 18.25 9.75H5.75C4.09315 9.75 2.75 11.0931 2.75 12.75"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);
