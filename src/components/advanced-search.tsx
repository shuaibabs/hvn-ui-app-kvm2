"use client";

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Info, Search, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export type AdvancedSearchState = {
  startWith: string;
  anywhere: string;
  endWith: string;
  mustContain: string;
  notContain: string;
  onlyContain: string;
  total: string;
  sum: string;
  maxContain: string;
  mostContains: boolean;
};

type AdvancedSearchProps = {
  initialState: AdvancedSearchState;
  onSearchChange: (newState: AdvancedSearchState) => void;
  onClear: () => void;
};

export function AdvancedSearch({ onSearchChange, initialState, onClear }: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchState, setSearchState] = useState(initialState);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setSearchState(prevState => ({
      ...prevState,
      [name]: val,
    }));
  };

  const handleSearch = () => {
    onSearchChange(searchState);
  };
  
  const handleClear = () => {
    setSearchState(initialState);
    onClear();
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-4"
    >
      <CollapsibleTrigger asChild>
        <Button variant="outline">
          <Search className="mr-2 h-4 w-4" />
          Advanced Search
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox id="mostContains" name="mostContains" checked={searchState.mostContains} onCheckedChange={(checked) => setSearchState(s => ({...s, mostContains: !!checked}))}/>
                <Label htmlFor="mostContains">Most Contains</Label>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Prioritize results based on the number of matches.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startWith">Start With</Label>
                  <Input id="startWith" name="startWith" placeholder="e.g: 987" value={searchState.startWith} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anywhere">Anywhere</Label>
                  <Input id="anywhere" name="anywhere" placeholder="e.g: 367" value={searchState.anywhere} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endWith">End With</Label>
                  <Input id="endWith" name="endWith" placeholder="e.g: 000" value={searchState.endWith} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mustContain">Must Contain</Label>
                  <Input id="mustContain" name="mustContain" placeholder="e.g: 14,18" value={searchState.mustContain} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notContain">Not Contain</Label>
                  <Input id="notContain" name="notContain" placeholder="e.g: 4,69" value={searchState.notContain} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onlyContain">Only Contain</Label>
                  <Input id="onlyContain" name="onlyContain" placeholder="e.g: 123" value={searchState.onlyContain} onChange={handleInputChange} />
                </div>
              </div>
               <p className="text-xs text-muted-foreground">For multiple values in Must/Not Contain, use a comma (e.g. 14,18).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total">Total (Sum of digits)</Label>
                  <Input id="total" name="total" placeholder="e.g: 45" value={searchState.total} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sum">Sum (Digital Root)</Label>
                  <Input id="sum" name="sum" placeholder="e.g: 9" value={searchState.sum} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxContain">Max-Contain (Frequency)</Label>
                  <Input id="maxContain" name="maxContain" placeholder="e.g: 3" value={searchState.maxContain} onChange={handleInputChange} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClear}>
                    <X className="mr-2 h-4 w-4" />
                    Clear
                </Button>
                <Button onClick={handleSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    Apply Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
