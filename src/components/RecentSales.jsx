const salesData = [
  { name: "Olivia Martin", email: "olivia.martin@email.com", amount: "+$1,999.00", initials: "OM" },
  { name: "Jackson Lee", email: "jackson.lee@email.com", amount: "+$39.00", initials: "JL" },
  { name: "Isabella Nguyen", email: "isabella.nguyen@email.com", amount: "+$299.00", initials: "IN" },
  { name: "William Kim", email: "will@email.com", amount: "+$99.00", initials: "WK" },
  { name: "Sofia Davis", email: "sofia.davis@email.com", amount: "+$39.00", initials: "SD" }
];

export default function RecentSales() {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 col-span-3 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-lg text-white">Recent Sales</h3>
        <p className="text-sm text-zinc-500">You made 265 sales this month.</p>
      </div>
      <div className="space-y-8">
        {salesData.map((sale, index) => (
          <div key={index} className="flex items-center">
            <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-white">
              {sale.initials}
            </div>
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none text-white">{sale.name}</p>
              <p className="text-sm text-zinc-500">{sale.email}</p>
            </div>
            <div className="ml-auto font-medium text-white">{sale.amount}</div>
          </div>
        ))}
      </div>
    </div>
  );
}