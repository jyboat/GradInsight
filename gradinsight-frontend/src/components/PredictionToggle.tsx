type Props = {
    enabled: boolean
    onChange: (newVal: boolean) => void
}

export const PredictionToggle = ({ enabled, onChange }: Props) => {
    return (
        <div className="mt-6 p-4 border rounded-lg bg-slate-50">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Step 4: Future Insights</h2>
                    <p className="text-sm text-gray-600">
                        Enable AI-driven predictions for upcoming years.
                    </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={enabled}
                        onChange={(e) => onChange(e.target.checked)}
                    />
                    {/* Toggle Switch UI */}
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>
        </div>
    )
}